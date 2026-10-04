keyestudioRobot.alRecepcionIR(IrButton.Down, IrButtonAction.Pressed, function () {
    keyestudioRobot.Mover(-100, -100)
})
keyestudioRobot.alRecepcionIR(IrButton.Right, IrButtonAction.Pressed, function () {
    keyestudioRobot.Mover(100, -100)
})
keyestudioRobot.alRecepcionIR(IrButton.Left, IrButtonAction.Pressed, function () {
    keyestudioRobot.Mover(-100, 100)
})
keyestudioRobot.alRecepcionIR(IrButton.Up, IrButtonAction.Pressed, function () {
    keyestudioRobot.Mover(100, 100)
})
keyestudioRobot.alRecepcionIR(IrButton.Any, IrButtonAction.Released, function () {
    keyestudioRobot.Mover(0, 0)
})
keyestudioRobot.conectarIR(DigitalPin.P16)
