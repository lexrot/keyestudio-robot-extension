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
    //% block="▲"
    Up = 0x62,
    //% block="num"
    Num = -5,
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

    // --- NUEVA VARIABLE GLOBAL: IR MEMORY ---
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

    // --- NUEVO MÓDULO: SENSORES SEGUIDORES DE LÍNEA ---

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
}