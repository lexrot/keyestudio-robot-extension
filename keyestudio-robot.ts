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

enum LineSensor {
    //% block="Izquierdo (P13)"
    Left = 0,
    //% block="Derecho (P12)"
    Right = 1
}

enum LineColor {
    //% block="Negro"
    Black = 1,
    //% block="Blanco"
    White = 0
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

    // --- SECCIÓN: IR MEMORY ---
    export let IR_memory: number[] = [];

    /**
     * Agrega un número al final de la lista IR memory.
     */
    //% block="IR memory agregar número $value"
    //% weight=78
    //% group="IR Memory"
    export function irMemoryAgregar(value: number): void {
        IR_memory.push(value);
    }

    /**
     * Devuelve el tamaño o cantidad de elementos en IR memory.
     */
    //% block="IR memory longitud"
    //% weight=77
    //% group="IR Memory"
    export function irMemoryLongitud(): number {
        return IR_memory.length;
    }

    /**
     * Obtiene el número guardado en una posición específica de la lista (empezando en 0).
     */
    //% block="IR memory obtener valor en posición $index"
    //% weight=76
    //% group="IR Memory"
    export function irMemoryObtener(index: number): number {
        if (index >= 0 && index < IR_memory.length) {
            return IR_memory[index];
        }
        return -1;
    }

    /**
     * Vacía por completo la lista IR memory.
     */
    //% block="IR memory vaciar lista"
    //% weight=75
    //% group="IR Memory"
    export function irMemoryVaciar(): void {
        IR_memory = [];
    }

    // --- SECCIÓN: SENSORES SEGUIDORES DE LÍNEA ---

    /**
     * Devuelve verdadero si el sensor seguidor de línea seleccionado detecta el color indicado.
     */
    //% block="Sensor de línea %sensor | detecta %color"
    //% weight=70
    //% group="Line Tracking"
    export function lineSensorState(sensor: LineSensor, color: LineColor): boolean {
        let pin = (sensor === LineSensor.Left) ? DigitalPin.P13 : DigitalPin.P12;
        pins.setPull(pin, PinPullMode.PullNone);
        return pins.digitalReadPin(pin) === color;
    }

    // --- SECCIÓN: RECEPTOR INFRARROJO ADAPTADO DE MAKERBIT ---
    const IR_REPEAT = 256;
    const IR_INCOMPLETE = 257;
    const IR_DATAGRAM = 258;
    const REPEAT_TIMEOUT_MS = 120;

    let irState: IrState = null;

    interface IrState {
        bitsReceived: number;
        commandSectionBits: number;
        hiword: number;
        loword: number;
        activeCommand: number;
        repeatTimeout: number;
        onIrButtonPressed: IrButtonHandler[];
        onIrButtonReleased: IrButtonHandler[];
        digitosIngresados: number[];
        okPresionado: boolean;
        numeroPresionadoActual: number;
    }

    class IrButtonHandler {
        irButton: IrButton;
        onEvent: () => void;
        constructor(irButton: IrButton, onEvent: () => void) {
            this.irButton = irButton;
            this.onEvent = onEvent;
        }
    }

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
        irState.bitsReceived += 1;
        if (irState.bitsReceived <= 8) {
            irState.hiword = (irState.hiword << 1) + bit;
            if (bit === 1) {
                irState.bitsReceived = 9;
                irState.hiword = 1;
            }
        } else if (irState.bitsReceived <= 16) {
            irState.hiword = (irState.hiword << 1) + bit;
        } else if (irState.bitsReceived <= 32) {
            irState.loword = (irState.loword << 1) + bit;
        }

        if (irState.bitsReceived === 32) {
            irState.commandSectionBits = irState.loword & 0xffff;
            return IR_DATAGRAM;
        } else {
            return IR_INCOMPLETE;
        }
    }

    function decode(markAndSpace: number): number {
        if (markAndSpace < 1600) {
            return appendBitToDatagram(0);
        } else if (markAndSpace < 2700) {
            return appendBitToDatagram(1);
        }
        irState.bitsReceived = 0;
        if (markAndSpace < 12500) {
            return IR_REPEAT;
        } else {
            return IR_INCOMPLETE;
        }
    }

    function handleIrEvent(irEvent: number) {
        if (irEvent === IR_DATAGRAM || irEvent === IR_REPEAT) {
            irState.repeatTimeout = input.runningTime() + REPEAT_TIMEOUT_MS;
        }

        if (irEvent === IR_DATAGRAM) {
            const newCommand = irState.commandSectionBits >> 8;

            if (newCommand !== irState.activeCommand) {
                if (irState.activeCommand >= 0) {
                    const releasedHandler = irState.onIrButtonReleased.find(h => h.irButton === irState.activeCommand || IrButton.Any === h.irButton || (IrButton.Num === h.irButton && traducirComandoANumero(irState.activeCommand) !== -99));
                    if (releasedHandler) {
                        control.inBackground(releasedHandler.onEvent);
                    }
                }

                if (newCommand === 0x02) {
                    irState.okPresionado = true;
                } else {
                    let num = traducirComandoANumero(newCommand);
                    if (num !== -99) {
                        irState.digitosIngresados.push(num);
                        irState.numeroPresionadoActual = num;
                    }
                }

                const pressedHandler = irState.onIrButtonPressed.find(h => h.irButton === newCommand || IrButton.Any === h.irButton || (IrButton.Num === h.irButton && traducirComandoANumero(newCommand) !== -99));
                if (pressedHandler) {
                    control.inBackground(pressedHandler.onEvent);
                }

                irState.activeCommand = newCommand;
            }
        }
    }

    function initIrState() {
        if (irState) return;
        irState = {
            bitsReceived: 0,
            commandSectionBits: 0,
            hiword: 0,
            loword: 0,
            activeCommand: -1,
            repeatTimeout: 0,
            onIrButtonPressed: [],
            onIrButtonReleased: [],
            digitosIngresados: [],
            okPresionado: false,
            numeroPresionadoActual: -1
        };
    }

/**
 * Configura el receptor Infrarrojo en el pin asignado.
 */
    //% block="connect IR receiver at pin %pin"
    //% pin.fieldEditor="gridpicker"
    //% pin.fieldOptions.columns=4
    //% pin.fieldOptions.tooltips="false"
    //% pin.defl=DigitalPin.P16
    //% weight=90
    //% group="IR Receiver"
    export function conectarIR(pin: DigitalPin): void {
        initIrState();
        pins.setPull(pin, PinPullMode.PullNone);
        let mark = 0;
        let space = 0;
        pins.onPulsed(pin, PulseValue.Low, () => {
            mark = pins.pulseDuration();
        });
        pins.onPulsed(pin, PulseValue.High, () => {
            space = pins.pulseDuration();
            const status = decode(mark + space);
            if (status !== IR_INCOMPLETE) {
                handleIrEvent(status);
            }
        });
        loops.everyInterval(REPEAT_TIMEOUT_MS, function () {
            notifyIrEvents();
        });
    }
    function notifyIrEvents() {
        if (irState.activeCommand === -1) {
            // skip
        } else {
            const now = input.runningTime();
            if (now > irState.repeatTimeout) {
                const handler = irState.onIrButtonReleased.find(h => h.irButton === irState.activeCommand || IrButton.Any === h.irButton || (IrButton.Num === h.irButton && traducirComandoANumero(irState.activeCommand) !== -99));
                if (handler) {
                    control.inBackground(handler.onEvent);
                }
                irState.bitsReceived = 0;
                irState.activeCommand = -1;
                irState.numeroPresionadoActual = -1;
            }
        }
    }
    /**
    * Acción al presionar o soltar un botón del control remoto.
    */
    //% blockId=keyestudio_infrared_on_ir_button
    //% block="on IR button | %button | %action"
    //% button.fieldEditor="gridpicker"
    //% button.fieldOptions.columns=3
    //% button.fieldOptions.tooltips="false"
    //% weight=85
    //% group="IR Receiver"
    export function alRecepcionIR(button: IrButton, action: IrButtonAction, handler: () => void) {
        initIrState();
        if (action === IrButtonAction.Pressed) {
            irState.onIrButtonPressed.push(new IrButtonHandler(button, handler));
        } else {
            irState.onIrButtonReleased.push(new IrButtonHandler(button, handler));
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
        if (!irState || irState.activeCommand === -1) {
            return action === IrButtonAction.Released;
        }
        let esNumero = traducirComandoANumero(irState.activeCommand) !== -99;
        let coincide = (button === irState.activeCommand || button === IrButton.Any || (button === IrButton.Num && esNumero));
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
        if (!irState) return false;
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
        if (irState.okPresionado) {
            irState.okPresionado = false;
            let esCorrecto = true;
            if (irState.digitosIngresados.length !== claveEsperada.length) {
                esCorrecto = false;
            } else {
                for (let i = 0; i < claveEsperada.length; i++) {
                    if (irState.digitosIngresados[i] !== claveEsperada[i]) {
                        esCorrecto = false;
                        break;
                    }
                }
            }
            irState.digitosIngresados = [];
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
        return irState ? irState.numeroPresionadoActual : -1;
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
        if (!irState || irState.activeCommand === -1) {
            return action === IrButtonAction.Released;
        }
        let numActual = traducirComandoANumero(irState.activeCommand);
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
    //% weight=60
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
