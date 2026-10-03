// Enums para el movimiento del motor
enum Motores {
    //% block="A"
    M1 = 1,
    //% block="B"
    M2 = 2
}

enum Direccion {
    //% block="Adelante"
    Adelante = 0,
    //% block="Atrás"
    Atras = 1
}

// Enums nativos del control Keyestudio (Estilo MakerBit)
enum IrButton {
    //% block="any"
    Any = -1,
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
    Number_6 = 0x7a,
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

    // --- LÓGICA DE BAJO NIVEL: MOTORES E I2C ---

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


    // --- LÓGICA INTERNA: DECODIFICADOR IR INDEPENDIENTE ---

    const IR_REPEAT = 256;
    const IR_INCOMPLETE = 257;
    const IR_DATAGRAM = 258;
    const REPEAT_TIMEOUT_MS = 120;

    interface IrState {
        bitsReceived: number;
        addressSectionBits: number;
        commandSectionBits: number;
        hiword: number;
        loword: number;
        activeCommand: number;
        repeatTimeout: number;
        onIrButtonPressed: IrButtonHandler[];
        onIrButtonReleased: IrButtonHandler[];
    }

    class IrButtonHandler {
        irButton: IrButton;
        onEvent: () => void;
        constructor(irButton: IrButton, onEvent: () => void) {
            this.irButton = irButton;
            this.onEvent = onEvent;
        }
    }

    let irState: IrState = null;

    function initIrState() {
        if (irState) return;
        irState = {
            bitsReceived: 0,
            addressSectionBits: 0,
            commandSectionBits: 0,
            hiword: 0,
            loword: 0,
            activeCommand: -1,
            repeatTimeout: 0,
            onIrButtonPressed: [],
            onIrButtonReleased: []
        };
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
            irState.addressSectionBits = irState.hiword & 0xffff;
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
        } else if (markAndSpace < 14500) {
            return IR_INCOMPLETE;
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
                    const releasedHandler = irState.onIrButtonReleased.find(h => h.irButton === irState.activeCommand || IrButton.Any === h.irButton);
                    if (releasedHandler) {
                        control.runInParallel(releasedHandler.onEvent);
                    }
                }

                const pressedHandler = irState.onIrButtonPressed.find(h => h.irButton === newCommand || IrButton.Any === h.irButton);
                if (pressedHandler) {
                    control.runInParallel(pressedHandler.onEvent);
                }
                irState.activeCommand = newCommand;
            }
        }
    }

    function notifyIrEvents() {
        while (true) {
            if (irState && irState.activeCommand !== -1) {
                const now = input.runningTime();
                if (now > irState.repeatTimeout) {
                    const handler = irState.onIrButtonReleased.find(h => h.irButton === irState.activeCommand || IrButton.Any === h.irButton);
                    if (handler) {
                        control.runInParallel(handler.onEvent);
                    }
                    irState.bitsReceived = 0;
                    irState.activeCommand = -1;
                }
            }
            basic.pause(REPEAT_TIMEOUT_MS);
        }
    }


    // --- BLOQUES PÚBLICOS DE LA EXTENSIÓN (ESTILO MAKERBIT) ---

    /**
     * Configura y conecta el receptor Infrarrojo físico en el pin asignado.
     */
    //% block="connect IR receiver at pin %pin"
    //% pin.fieldEditor="gridpicker"
    //% pin.fieldOptions.columns=4
    //% pin.fieldOptions.tooltips="false"
    //% pin.defl=DigitalPin.P16
    //% weight=90
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

        control.runInParallel(notifyIrEvents);
    }

    /**
     * Do something when a specific button is pressed or released on the remote control.
     */
    //% blockId=keyestudio_infrared_on_ir_button
    //% block="on IR button | %button | %action"
    //% button.fieldEditor="gridpicker"
    //% button.fieldOptions.columns=3
    //% button.fieldOptions.tooltips="false"
    //% weight=85
    export function alRecepcionIR(button: IrButton, action: IrButtonAction, handler: () => void) {
        initIrState();
        if (action === IrButtonAction.Pressed) {
            irState.onIrButtonPressed.push(new IrButtonHandler(button, handler));
        } else {
            irState.onIrButtonReleased.push(new IrButtonHandler(button, handler));
        }
    }

    /**
     * Lectura directa del sensor de ultrasonido integrado (P14 y P15).
     */
    //% block="Distancia Ultrasonido (cm)"
    //% weight=80
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

