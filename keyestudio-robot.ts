enum LED_L_R_Both {
    //% block="ambos LEDs"
    Both = 2,
    //% block="LED Derecho"
    LED_R = 1,
    //% block="LED Izquierdo"
    LED_L = 0
}

enum IrButton {
    //% block="any"
    Any = -1,
    //% block="num"
    Num = -5,
    //% block="▲"
    Up = 0x62,
    //% block=" "
    Unused_2 = -2,
    //% block="◀"
    Left = 0x22,
    //% block="OK"
    Ok = 0x02,
    //% block="▶"
    Right = 0xc2,
    //% block=" "
    Unused_3 = -3,
    //% block="▼"
    Down = 0xa8,
    //% block=" "
    Unused_4 = -4,
    //% block="1"
    Number_1 = 0x68,
    //% block="2"
    Number_2 = 0x98,
    //% block="3"
    Number_3 = 0xb0,
    //% block="4"
    Number_4 = 0x30,
    //% block="5"
    Number_5 = 0x18,
    //% block="6"
    Number_6 = 74,
    //% block="7"
    Number_7 = 0x10,
    //% block="8"
    Number_8 = 0x38,
    //% block="9"
    Number_9 = 0x5a,
    //% block="*"
    Star = 0x42,
    //% block="0"
    Number_0 = 0x4a,
    //% block="#"
    Hash = 0x52
}

enum IrButtonAction {
    //% block="pressed"
    Pressed = 0,
    //% block="released"
    Released = 1
}

//% color="#AA278D" icon="\uf1b9" block="Keyestudio Robot"
namespace keyestudioRobot {

    function i2cWrite(reg: number, value: number): void {
        let buf = pins.createBuffer(2);
        buf[0] = reg;
        buf[1] = value;
        pins.i2cWriteBuffer(0x30, buf);
    }

    /**
     * Mueve ambos motores usando coordenadas directas (-255 a 255).
     */
    //% block="Mover motor A $a motor B $b"
    //% a.min=-255 a.max=255 b.min=-255 b.max=255
    //% weight=100
    //% group="Motors"
    export function Mover(a: number, b: number): void {
        if (a > 0) {
            i2cWrite(0x02, a); i2cWrite(0x01, 0);
        } else if (a < 0) {
            i2cWrite(0x02, 0); i2cWrite(0x01, Math.abs(a));
        } else {
            i2cWrite(0x02, 0); i2cWrite(0x01, 0);
        }

        if (b > 0) {
            i2cWrite(0x03, b); i2cWrite(0x04, 0);
        } else if (b < 0) {
            i2cWrite(0x03, 0); i2cWrite(0x04, Math.abs(b));
        } else {
            i2cWrite(0x03, 0); i2cWrite(0x04, 0);
        }
    }

    /**
     * Define el color de los LEDs mezclando cantidades de R, G y B (0 a 255).
     */
    //% block="Fijar color en %place | R $r G $g B $b"
    //% r.min=0 r.max=255 g.min=0 g.max=255 b.min=0 b.max=255
    //% weight=90
    //% group="RGB LED"
    export function fijarRGB(place: LED_L_R_Both, r: number, g: number, b: number): void {
        let valR = 255 - Math.clamp(0, 255, r);
        let valG = 255 - Math.clamp(0, 255, g);
        let valB = 255 - Math.clamp(0, 255, b);

        if (place === LED_L_R_Both.LED_R || place === LED_L_R_Both.Both) {
            i2cWrite(0x08, valR); i2cWrite(0x07, valG); i2cWrite(0x06, valB);
        }
        if (place === LED_L_R_Both.LED_L || place === LED_L_R_Both.Both) {
            i2cWrite(0x09, valR); i2cWrite(0x0a, valG); i2cWrite(0x05, valB);
        }
    }

    /**
     * Apaga por completo las luces LED RGB del chasis del coche.
     */
    //% block="LED OFF"
    //% weight=80
    //% group="RGB LED"
    export function LED_OFF() {
        i2cWrite(0x08, 255); i2cWrite(0x07, 255); i2cWrite(0x06, 255);
        i2cWrite(0x09, 255); i2cWrite(0x0a, 255); i2cWrite(0x05, 255);
    }
    const IR_REPEAT = 256;
    const IR_INCOMPLETE = 257;
    const IR_DATAGRAM = 258;
    let bitsReceived = 0;
    let hiword = 0;
    let loword = 0;
    let commandSectionBits = 0;
    let activeCommand = -1;
    let repeatTimeout = 0;
    const REPEAT_TIMEOUT_MS = 140;

    let handlerPressed: () => void = null;
    let handlerReleased: () => void = null;
    let targetButton: number = -1;

    let digitosIngresados: number[] = [];
    let okPresionado = false;
    let numeroPresionadoActual = -1;

    function traducirComandoANumero(cmd: number): number {
        switch (cmd) {
            case 0x4a: return 0;
            case 0x68: return 1;
            case 0x98: return 2;
            case 0xb0: return 3;
            case 0x30: return 4;
            case 0x18: return 5;
            case 0x7a: return 6;
            case 0x10: return 7;
            case 0x38: return 8;
            case 0x5a: return 9;
            default: return -99;
        }
    }

    function appendBitToDatagram(bit: number): number {
        bitsReceived += 1;
        if (bitsReceived <= 8) {
            hiword = (hiword << 1) + bit;
            if (bit === 1) {
                bitsReceived = 9;
                hiword = 1;
            }
        } else if (bitsReceived <= 16) {
            hiword = (hiword << 1) + bit;
        } else if (bitsReceived <= 32) {
            loword = (loword << 1) + bit;
        }

        if (bitsReceived === 32) {
            commandSectionBits = loword & 0xffff;
            return 258;
        } else {
            return 257;
        }
    }

    function decode(markAndSpace: number): number {
        if (markAndSpace < 1600) {
            return appendBitToDatagram(0);
        } else if (markAndSpace < 2700) {
            return appendBitToDatagram(1);
        }
        bitsReceived = 0;
        if (markAndSpace < 12500) {
            return 256;
        }
        return 257;
    }

    function ejecutarHandlerSeguro(handler: () => void) {
        if (handler) {
            control.inBackground(handler);
        }
    }

    function handleIrEvent(irEvent: number) {
        let ahora = input.runningTime();

        if (irEvent === 258) {
            let nuevoComando = commandSectionBits >> 8;
            repeatTimeout = ahora + REPEAT_TIMEOUT_MS;

            if (activeCommand >= 0 && nuevoComando !== activeCommand) {
                if (targetButton === activeCommand || targetButton === -1 || (targetButton === -5 && traducirComandoANumero(activeCommand) !== -99)) {
                    ejecutarHandlerSeguro(handlerReleased);
                }
                activeCommand = -1;
            }

            if (nuevoComando !== activeCommand) {
                if (nuevoComando === 0x02) {
                    okPresionado = true;
                } else {
                    let num = traducirComandoANumero(nuevoComando);
                    if (num !== -99) {
                        digitosIngresados.push(num);
                        numeroPresionadoActual = num;
                    }
                }

                activeCommand = nuevoComando;
                if (targetButton === activeCommand || targetButton === -1 || (targetButton === -5 && traducirComandoANumero(activeCommand) !== -99)) {
                    ejecutarHandlerSeguro(handlerPressed);
                }
            }
        } else if (irEvent === 256) {
            repeatTimeout = ahora + REPEAT_TIMEOUT_MS;
        }
    }

    function notifyIrEvents() {
        if (activeCommand !== -1 && input.runningTime() > repeatTimeout) {
            if (targetButton === activeCommand || targetButton === -1 || (targetButton === -5 && traducirComandoANumero(activeCommand) !== -99)) {
                ejecutarHandlerSeguro(handlerReleased);
            }
            bitsReceived = 0;
            activeCommand = -1;
            numeroPresionadoActual = -1;
        }
    }

    /**
     * Configura el receptor Infrarrojo en el pin asignado de forma reactiva por hardware.
     */
    //% block="connect IR receiver at pin %pin"
    //% pin.fieldEditor="gridpicker"
    //% pin.fieldOptions.columns=4
    //% pin.fieldOptions.tooltips="false"
    //% pin.defl=DigitalPin.P16
    //% weight=90
    //% group="IR Receiver"
    export function conectarIR(pin: DigitalPin): void {
        pins.setPull(pin, PinPullMode.PullNone);
        let mark = 0;
        let space = 0;

        pins.onPulsed(pin, PulseValue.Low, () => {
            mark = pins.pulseDuration();
        });

        pins.onPulsed(pin, PulseValue.High, () => {
            space = pins.pulseDuration();
            let status = decode(mark + space);
            if (status !== 257) {
                handleIrEvent(status);
            }
        });

        loops.everyInterval(30, function () {
            notifyIrEvents();
        });
    }

    /**
     * Acción basada en eventos limpios al presionar o soltar un botón del control remoto.
     */
    //% blockId=keyestudio_infrared_on_ir_button
    //% block="on IR button | %button | %action"
    //% button.fieldEditor="gridpicker"
    //% button.fieldOptions.columns=3
    //% button.fieldOptions.tooltips="false"
    //% weight=85
    //% group="IR Receiver"
    export function alRecepcionIR(button: IrButton, action: IrButtonAction, handler: () => void) {
        targetButton = button;
        if (action === IrButtonAction.Pressed) {
            handlerPressed = handler;
        } else {
            handlerReleased = handler;
        }
    }

    /**
     * Devuelve verdadero si el botón seleccionado se encuentra en el estado indicado.
     */
    //% blockId=keyestudio_ir_button_is_pressed
    //% block="button %button | is %action"
    //% button.fieldEditor="gridpicker"
    //% button.fieldOptions.columns=3
    //% button.fieldOptions.tooltips="false"
    //% weight=84
    //% group="IR Receiver"
    export function botonEstado(button: IrButton, action: IrButtonAction): boolean {
        if (activeCommand === -1) {
            return action === IrButtonAction.Released;
        }
        let esNumero = traducirComandoANumero(activeCommand) !== -99;
        let coincide = (button === activeCommand || button === -1 || (button === -5 && esNumero));
        if (action === IrButtonAction.Pressed) {
            return coincide;
        } else {
            return !coincide;
        }
    }

    /**
     * Compara los números ingresados en el control con una contraseña de hasta 10 dígitos. Devuelve True si es idéntica al presionar OK.
     */
    //% blockId=keyestudio_password_check
    //% block="password correct digits: $digit1 || $digit2 $digit3 $digit4 $digit5 $digit6 $digit7 $digit8 $digit9 $digit10"
    //% digit1.min=0 digit1.max=9 digit2.min=0 digit2.max=9 digit3.min=0 digit3.max=9 digit4.min=0 digit4.max=9 digit5.min=0 digit5.max=9
    //% digit6.min=0 digit6.max=9 digit7.min=0 digit7.max=9 digit8.min=0 digit8.max=9 digit9.min=0 digit9.max=9 digit10.min=0 digit10.max=9
    //% inlineInputMode=inline
    //% weight=83
    //% group="IR Receiver"
    export function verificarPassword(digit1: number, digit2?: number, digit3?: number, digit4?: number, digit5?: number, digit6?: number, digit7?: number, digit8?: number, digit9?: number, digit10?: number): boolean {
        let claveEsperada: number[] = [];
        if (digit1 !== undefined) claveEsperada.push(digit1);
        if (digit2 !== undefined) claveEsperada.push(digit2);
        if (digit3 !== undefined) claveEsperada.push(digit3);
        if (digit4 !== undefined) claveEsperada.push(digit4);
        if (digit5 !== undefined) claveEsperada.push(digit5);
        if (digit6 !== undefined) claveEsperada.push(digit6);
        if (digit7 !== undefined) claveEsperada.push(digit7);
        if (digit8 !== undefined) claveEsperada.push(digit8);
        if (digit9 !== undefined) claveEsperada.push(digit9);
        if (digit10 !== undefined) claveEsperada.push(digit10);

        if (okPresionado) {
            okPresionado = false;
            let esCorrecto = true;
            if (digitosIngresados.length !== claveEsperada.length) {
                esCorrecto = false;
            } else {
                for (let i = 0; i < claveEsperada.length; i++) {
                    if (digitosIngresados[i] !== claveEsperada[i]) {
                        esCorrecto = false;
                        break;
                    }
                }
            }
            digitosIngresados = [];
            return esCorrecto;
        }
        return false;
    }

    /**
     * Pausa y congela la ejecución del programa hasta que el usuario digite la clave correcta (hasta 10 dígitos) y presione OK.
     */
    //% blockId=keyestudio_password_pause
    //% block="pause until password: $digit1 || $digit2 $digit3 $digit4 $digit5 $digit6 $digit7 $digit8 $digit9 $digit10"
    //% digit1.min=0 digit1.max=9 digit2.min=0 digit2.max=9 digit3.min=0 digit3.max=9 digit4.min=0 digit4.max=9 digit5.min=0 digit5.max=9
    //% digit6.min=0 digit6.max=9 digit7.min=0 digit7.max=9 digit8.min=0 digit8.max=9 digit9.min=0 digit9.max=9 digit10.min=0 digit10.max=9
    //% inlineInputMode=inline
    //% weight=82
    //% group="IR Receiver"
    export function pausaHastaPassword(digit1: number, digit2?: number, digit3?: number, digit4?: number, digit5?: number, digit6?: number, digit7?: number, digit8?: number, digit9?: number, digit10?: number): void {
        while (true) {
            if (verificarPassword(digit1, digit2, digit3, digit4, digit5, digit6, digit7, digit8, digit9, digit10)) {
                break;
            }
            basic.pause(50);
        }
    }

    /**
     * Devuelve el número de tipo entero (0-9) que está siendo presionado en este instante, o -1 si no hay ningún número activo.
     */
    //% block="last pressed digit"
    //% weight=81
    //% group="IR Receiver"
    export function ultimoDigitoPresionado(): number {
        return numeroPresionadoActual;
    }
    /**
    * Compara un número entero de manera directa (ingresado como int) y devuelve verdadero si se cumple la acción.
    */
    //% blockId=keyestudio_int_number_check
    //% block="number $num | is $action"
    //% num.min=0 num.max=9
    //% weight=80
    //% group="IR Receiver"
    export function numeroEnteroEstado(num: number, action: IrButtonAction): boolean {
        if (activeCommand === -1) {
            return action === IrButtonAction.Released;
        }
        let numActual = traducirComandoANumero(activeCommand);
        let coincide = (numActual === num);
        if (action === IrButtonAction.Pressed) {
            return coincide;
        } else {
            return !coincide;
        }
    }
    /**
    * Lectura directa del sensor de ultrasonido integrado (P14 y P15).
    */
    //% block="Distancia Ultrasonido (cm)"
    //% weight=80
    //% group="Ultrasonic"
    export function distanciaUltrasonido(): number {
        pins.setPull(DigitalPin.P14, PinPullMode.PullNone);
        pins.digitalWritePin(DigitalPin.P14, 0);
        control.waitMicros(2);
        pins.digitalWritePin(DigitalPin.P14, 1);
        control.waitMicros(10);
        pins.digitalWritePin(DigitalPin.P14, 0);
        let t = pins.pulseIn(DigitalPin.P15, PulseValue.High, 35000);
        if (t == 0) return 400;
        return Math.round(t / 58);
    }
}