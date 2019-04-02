const vcanvas = document.getElementById("vcanvas");
//const vcanvas = document.createElement('canvas');
const vctx = vcanvas.getContext("2d");

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const SCREEN_W = 800;
const SCREEN_H = 600;
const SCREEN_CENTER_X = SCREEN_W / 2;
const SCREEN_CENTER_Y = SCREEN_H / 2;

const FIELD_W = 300;
const FIELD_H = 300;

const cSize = 10;
const boxSize = 10;

let vmouse;
let mouse;
let walls = [];
let ray;
let particle;
let scale = 10000;
let wallHeight = 100;

vcanvas.width = FIELD_W;
vcanvas.height = FIELD_H;

canvas.width = SCREEN_W;
canvas.height = SCREEN_H;

class Vec2 {
	constructor(x, y) {
		this.x = x;
		this.y = y;
	}
	//角度からベクトルへ
	static fromAngle(angle) {
		return new Vec2(Math.cos(angle), Math.sin(angle));
	}
	//二点間の距離
	static distanse(a, b) {
		return a.sub(b).mag();
	}
	//足し算
	add(b) {
		let a = this;
		return new Vec2(a.x + b.x, a.y + b.y);
	}
	//引き算
	sub(b) {
		let a = this;
		return new Vec2(a.x - b.x, a.y - b.y);
	}
	//コピー
	copy() {
		return new Vec2(this.x, this.y);
	}
	//実数s倍
	mult(s) {
		return new Vec2(s * this.x, s * this.y);
	}
	//ベクトルの大きさ
	mag() {
		return Math.sqrt(this.x ** 2 + this.y ** 2);
	}
	//正規化
	norm() {
		return new Vec2(this.x / this.mag(), this.y / this.mag());
	}
	//ドット積
	dot(b) {
		let a = this;
		return a.x * b.x + a.y * b.y;
	}
	//角度
	heading(b) {
		let a = this;
		let dot = a.dot(b);
		let cosAngle = (dot / a.mag()) * b.mag();
		return Math.acos(cosAngle);
	}
}

class Boundary {
	constructor(x1, y1, x2, y2) {
		this.a = new Vec2(x1, y1);
		this.b = new Vec2(x2, y2);
	}
	draw() {
		vctx.strokeStyle = "rgba(255,255,255,1)";
		vctx.lineWidth = 1;
		vdrawLine(this.a.x, this.a.y, this.b.x, this.b.y);
	}
}

class Ray {
	constructor(pos, angle) {
		this.pos = pos;
		this.dir = Vec2.fromAngle(angle);
	}
	setAngle(angle) {
		this.dir = Vec2.fromAngle(angle);
	}
	lookAt(x, y) {
		this.dir = new Vec2(x - this.pos.x, y - this.pos.y).norm();
	}
	draw() {
		vctx.strokeStyle = "rgba(255,255,255,1)";
		vctx.lineWidth = 1;
		vdrawLine(
			this.pos.x,
			this.pos.y,
			this.pos.x + this.dir.x * 10,
			this.pos.y + this.dir.y * 10
		);
	}
	cast(wall) {
		const x1 = wall.a.x;
		const y1 = wall.a.y;
		const x2 = wall.b.x;
		const y2 = wall.b.y;

		const x3 = this.pos.x;
		const y3 = this.pos.y;
		const x4 = this.pos.x + this.dir.x;
		const y4 = this.pos.y + this.dir.y;

		const den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
		if (den == 0) {
			return;
		}

		const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / den;
		const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / den;

		if (t > 0 && t < 1 && u > 0) {
			let x = x1 + t * (x2 - x1);
			let y = y1 + t * (y2 - y1);
			return new Vec2(x, y);
		} else {
			return;
		}
	}
}

class Particle {
	constructor() {
		this.pos = new Vec2(FIELD_W / 2, FIELD_H / 2);
		this.rays = [];
		this.heading = 0;
		this.lineDensity = 10;
		this.viewAngle = 60;
		for (
			let i = -this.viewAngle / 2;
			i < this.viewAngle / 2;
			i += 1 / this.lineDensity
		) {
			this.rays.push(new Ray(this.pos, (i * Math.PI) / 180 + this.heading));
		}
	}
	rotate(angle) {
		this.heading += angle;
		let index = 0;
		for (
			let i = -this.viewAngle / 2;
			i < this.viewAngle / 2;
			i += 1 / this.lineDensity
		) {
			this.rays[index].setAngle((i * Math.PI) / 180 + this.heading);
			index++;
		}
	}
	move(dir, s) {
		const vel = Vec2.fromAngle(this.heading + dir);
		this.pos = this.pos.add(vel.mult(s));
		this.rays.forEach((ray) => (ray.pos = ray.pos.add(vel.mult(s))));
	}
	update(mouse) {
		this.pos = mouse;
		this.rays.forEach((ray) => (ray.pos = mouse));
	}
	look(walls) {
		const scene = [];
		for (let i = 0; i < this.rays.length; i++) {
			let closest = null;
			let recode = Infinity;
			for (let wall of walls) {
				const point = this.rays[i].cast(wall);
				if (point) {
					let dist = Vec2.distanse(this.pos, point);
					const angle = this.rays[i].dir.heading(Vec2.fromAngle(this.heading));
					dist *= Math.abs(Math.cos(angle) || 1);
					if (dist < recode) {
						recode = dist;
						closest = point;
					}
				}
			}
			if (closest) {
				vctx.strokeStyle = "rgba(255,255,255,0.25)";
				vctx.lineWidth = 1;
				vdrawLine(this.pos.x, this.pos.y, closest.x, closest.y);
			}
			scene[i] = recode;
		}
		return scene;
	}
	draw() {
		vctx.fillStyle = "rgba(255,255,255,1)";
		vdrawCircle(this.pos.x, this.pos.y, 5);
		for (let ray of this.rays) {
			ray.draw();
		}
	}
}

function drawLine(x1, y1, x2, y2) {
	// パスの開始
	ctx.beginPath();
	// 起点
	ctx.moveTo(x1, y1);
	// 終点
	ctx.lineTo(x2, y2);
	// 描画
	ctx.stroke();
}

function vdrawLine(x1, y1, x2, y2) {
	// パスの開始
	vctx.beginPath();
	// 起点
	vctx.moveTo(x1, y1);
	// 終点
	vctx.lineTo(x2, y2);
	// 描画
	vctx.stroke();
}

function vdrawCircle(x, y, r) {
	// パスの開始
	vctx.beginPath();
	vctx.arc(x, y, r, 0, 2 * Math.PI, false);
	//描画
	vctx.fill();
}

function rand(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

function ratio(value, start1, stop1, start2, stop2) {
	const range1 = stop1 - start1;
	const range2 = stop2 - start2;
	const rat = (value - start1) / range1;

	return range2 * rat + start2;
}

mouse = new Vec2(0, 0);
vmouse = new Vec2(0, 0);

for (let x = 0; x <= FIELD_W - boxSize; x += boxSize) {
	for (let y = 0; y <= FIELD_H - boxSize; y += boxSize) {
		if (rand(0, 10) < 1) {
			let s = boxSize;

			walls.push(new Boundary(x, y, x + s, y));
			walls.push(new Boundary(x + s, y, x + s, y + s));
			walls.push(new Boundary(x + s, y + s, x, y + s));
			walls.push(new Boundary(x, y + s, x, y));
		}
	}
}

walls.push(new Boundary(0, 0, FIELD_W, 0));
walls.push(new Boundary(0, FIELD_H, FIELD_W, FIELD_H));
walls.push(new Boundary(0, 0, 0, FIELD_H));
walls.push(new Boundary(FIELD_W, 0, FIELD_W, FIELD_H));

ray = new Ray(100, 150);
particle = new Particle();

function animate() {
	window.requestAnimationFrame(animate);

	vctx.fillStyle = "rgba(0,0,0,1)";
	vctx.fillRect(0, 0, FIELD_W, FIELD_H);
	ctx.fillStyle = "rgba(0,0,0,1)";
	ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);

	for (let wall of walls) {
		wall.draw();
	}
	//particle.update(vmouse);
	particle.draw();
	const scene = particle.look(walls);
	const w = SCREEN_W / scene.length;

	for (let i = 0; i < scene.length; i++) {
		const bright = ratio(scene[i], 0, Math.max(FIELD_W, FIELD_H) - 200, 255, 0);
		//const shade   = ratio(scene[i], 0, Math.max(FIELD_W,FIELD_H)-100, 1, 0);
		//const height  = 10000 / ratio(scene[i], 0, SCREEN_W, 0, SCREEN_H);
		const height = scale / scene[i];
		const shade = ratio(height, SCREEN_H / 40, SCREEN_H, 0, 1);

		ctx.fillStyle = "rgba(" + bright + "," + bright + "," + bright + ",1)";
		//ctx.fillStyle = 'rgba(255,255,255,'+shade+')';
		ctx.fillRect(i * w, (SCREEN_H - height) / 2, w + 1, height);
	}

	// ctx.strokeStyle = "rgba(255,255,255,1)";
	// ctx.lineWidth = 1;
	// drawLine((SCREEN_W-cSize)/2, SCREEN_H/2, (SCREEN_W+cSize)/2, SCREEN_H/2);
	// drawLine(SCREEN_W/2, (SCREEN_H-cSize)/2, SCREEN_W/2, (SCREEN_H+cSize)/2);
}
animate();

document.addEventListener(
	"DOMContentLoaded",
	function () {
		canvas.requestPointerLock =
			canvas.requestPointerLock || canvas.mozRequestPointerLock;
		document.exitPointerLock =
			document.exitPointerLock || document.mozExitPointerLock;

		if (
			document.pointerLockElement === canvas ||
			document.mozPointerLockElement === canvas
		) {
			console.log("The pointer lock status is now locked");
		} else {
			console.log("The pointer lock status is now unlocked");
		}

		document.addEventListener("pointerlockchange", lockChangeAlert, false);
		document.addEventListener("mozpointerlockchange", lockChangeAlert, false);

		document.addEventListener(
			"click",
			function () {
				canvas.requestPointerLock();
			},
			false
		);

		document.addEventListener(
			"keydown",
			function (e) {
				console.log(e.key);
				switch (e.key) {
					case "a":
						particle.move((Math.PI / 2) * 3, 1);
						break;
					case "d":
						particle.move(Math.PI / 2, 1);
						break;
					case "w":
						particle.move(0, 1);
						break;
					case "s":
						particle.move(Math.PI, 1);
						break;
				}
			},
			false
		);
	},
	false
);

function lockChangeAlert() {
	if (
		document.pointerLockElement === canvas ||
		document.mozPointerLockElement === canvas
	) {
		console.log("The pointer lock status is now locked");
		document.addEventListener("mousemove", updatePosition, false);
	} else {
		console.log("The pointer lock status is now unlocked");
		document.removeEventListener("mousemove", updatePosition, false);
	}
}

function updatePosition(e) {
	particle.rotate(e.movementX / 200);
}
