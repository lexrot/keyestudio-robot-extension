// Enums nativos del control Keyestudio (Con espacios restaurados para la cuadrícula)
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

    // --- MOTORES E I2C ---
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

    // --- DECODIFICADOR IR INDEPENDIENTE SIMPLIFICADO ---
    const IR_REPEAT = 256;
    const IR_INCOMPLETE = 257;
    const IR_DATAGRAM = 258;
    const REPEAT_TIMEOUT_MS = 120;

    let bitsReceived = 0;
    let hiword = 0;
    let loword = 0;
    let commandSectionBits = 0;
    let activeCommand = -1;
    let repeatTimeout = 0;

    let handlerPressed: () => void = null;
    let handlerReleased: () => void = null;
    let targetButton: number = -1;

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
        bitsReceived = 0;
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
            repeatTimeout = input.runningTime() + REPEAT_TIMEOUT_MS;
        }

        if (irEvent === IR_DATAGRAM) {
            const newCommand = commandSectionBits >> 8;

            if (newCommand !== activeCommand) {
                if (activeCommand >= 0) {
                    if ((targetButton === activeCommand || targetButton === -1) && handlerReleased) {
                        control.inBackground(handlerReleased);
                    }
                }

                if ((targetButton === newCommand || targetButton === -1) && handlerPressed) {
                    control.inBackground(handlerPressed);
                }
                activeCommand = newCommand;
            }
        }
    }

    function notifyIrEvents() {
        if (activeCommand !== -1) {
            const now = input.runningTime();
            if (now > repeatTimeout) {
                if ((targetButton === activeCommand || targetButton === -1) && handlerReleased) {
                    control.inBackground(handlerReleased);
                }
                bitsReceived = 0;
                activeCommand = -1;
            }
        }
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
    export function conectarIR(pin: DigitalPin): void {
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

    /**
     * Acción al presionar o soltar un botón del control remoto.
     */
    //% blockId=keyestudio_infrared_on_ir_button
    //% block="on IR button | %button | %action"
    //% button.fieldEditor="gridpicker"
    //% button.fieldOptions.columns=3
    //% button.fieldOptions.tooltips="false"
    //% weight=85
    export function alRecepcionIR(button: IrButton, action: IrButtonAction, handler: () => void) {
        targetButton = button;
        if (action === IrButtonAction.Pressed) {
            handlerPressed = handler;
        } else {
            handlerReleased = handler;
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
