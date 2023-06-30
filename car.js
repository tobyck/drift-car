const initCanvas = canvas => {
    // size canvas to window
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    return canvas.getContext("2d");
}

// canvas for the car
const carCanvas = document.querySelector("#car-canvas");
const carCtx = initCanvas(carCanvas);

// canvas for the tracks
const trackCanvas = document.querySelector("#track-canvas");
const trackCtx = initCanvas(trackCanvas);

// object to store pressed keys
const keys = {};

// checks if any of the given keys are pressed
const keysPressed = (..._keys) => _keys.some(key => keys[key]);

// add key to keys object when pressed
document.addEventListener("keydown", event => {
    keys[event.key.toLowerCase()] = true;
});

// delete key when released
document.addEventListener("keyup", event => {
    delete keys[event.key.toLowerCase()];
});
 
class Vec {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    magnitude() {
        return Math.hypot(this.x, this.y);
    }
    
    rotate(origin, angle) {
        const x = this.x - origin.x;
        const y = this.y - origin.y;

        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        return new Vec(
            x * cos - y * sin + origin.x,
            x * sin + y * cos + origin.y
        );
    }
}

class Car {
    steeringAngle = 0; // angle that the car is rendered at (starts facing up)
    turnRate = 0; // rate at which the car is turning
    velocity = new Vec();
    acceleration = new Vec();

    get height() {
        return this.image.height * (this.width / this.image.width);
    }

    get maxSpeed() {
        return this.accelerationScalar / (1 - this.friction);
    }

    // config
    accelerationScalar = .15; // how much velocity is added when accelerating
    friction = .96; // what percentage of velocity is kept each tick
    get agility() {
        return .06 * (keysPressed("s", "arrowdown") ? -1 : 1)
    }

    constructor(pos, image, width) {
        this.pos = pos;
        this.image = image;
        this.width = width;
    }

    renderCar(ctx) {
        ctx.save()
        ctx.translate(this.pos.x, this.pos.y);
        ctx.rotate(this.steeringAngle);
        ctx.drawImage(this.image, -this.width / 2, -this.image.height / 4, this.width, this.height);
        ctx.restore();
    }

    // render 3x3 square at vec to make tracks
    renderTrack(ctx, vec) {
        ctx.fillStyle = "rgba(0, 0, 0, .1)";
        ctx.fillRect(vec.x, vec.y, 3, 3);
    }

    move() {
        // set turn rate based on keys pressed
        if (keysPressed("a", "arrowleft") && keysPressed("d", "arrowright")) this.turnRate = 0;
        else if (keysPressed("a", "arrowleft")) this.turnRate = -this.agility;
        else if (keysPressed("d", "arrowright")) this.turnRate = this.agility;

        // change angle based on turn rate and velocity
        if (this.velocity.magnitude() > 0) {
            this.steeringAngle += this.turnRate * (this.velocity.magnitude() / this.maxSpeed);
        }

        // accelerate/decelerate
        if (keysPressed("w", "arrowup") && keysPressed("s", "arrowdown")) this.acceleration = new Vec();
        else if (keysPressed("w", "arrowup")) this.acceleration = new Vec(0, -this.accelerationScalar);
        else if (keysPressed("s", "arrowdown")) this.acceleration = new Vec(0, this.accelerationScalar);
        
        // stop accelerating/turning if up/down not pressed
        if (!keysPressed("w", "arrowup", "s", "arrowdown")) this.acceleration = new Vec();

        // stop turning if left/right not pressed and still accelerating/decelerating
        else if (!keysPressed("a", "arrowleft", "d", "arrowright")) this.turnRate = 0;

        // rotate acceleration vector so it's relative to the world instead of the car
        const relativeToWorld = this.acceleration.rotate(new Vec(), this.steeringAngle);

        // add acceleration to velocity
        this.velocity.x += relativeToWorld.x;
        this.velocity.y += relativeToWorld.y;

        // apply friction
        this.velocity.x *= this.friction;
        this.velocity.y *= this.friction;

        // stop moving completely if velocity is very small
        if (Math.abs(this.velocity.magnitude()) < .1) this.velocity = new Vec();

        // move car based on velocity
        this.pos.x += this.velocity.x;
        this.pos.y += this.velocity.y;

        // wrap around screen
        if (this.pos.x > carCanvas.width) this.pos.x = 0;
        if (this.pos.x < 0) this.pos.x = carCanvas.width;
        if (this.pos.y > carCanvas.height) this.pos.y = 0;
        if (this.pos.y < 0) this.pos.y = carCanvas.height;

        // add tracks if turning annd moving
        if (keysPressed("d", "arrowright") ^ keysPressed("a", "arrowleft") && this.velocity.magnitude() > 0) {
            this.renderTrack(trackCtx, new Vec(this.pos.x - this.width / 2 + 3, this.pos.y + this.height / 2).rotate(this.pos, this.steeringAngle));
            this.renderTrack(trackCtx, new Vec(this.pos.x + this.width / 2, this.pos.y + this.height / 2).rotate(this.pos, this.steeringAngle));
        }
    }
}

const image = new Image();
image.src = "car.png";

// wait for image to load before creating car
image.onload = () => {
    const car = new Car(new Vec(400, 400), image, 25);

    const tick = () => {
        carCtx.clearRect(0, 0, carCanvas.width, carCanvas.height);
        car.move();
        car.renderCar(carCtx);
        requestAnimationFrame(tick);
    }

    tick();
}