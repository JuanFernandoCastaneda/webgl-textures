const canvas = document.getElementById("game-surface");
const gl = canvas.getContext("webgl");

const DEFINICION_CIRCULOS = 20;

const mat4 = glMatrix.mat4;
const glmat = glMatrix.glMatrix;
// const {mat2, mat3, mat4} = glMatrix;

function main() {

    if (!gl) { return; }

    // BOTH SHADERS
    // If its put in this way, one can check for the number of the error in compiletime.
    // List begins in 1 and the error appears in the next line. Thus, if an error is made in the
    // second line, it'll be shown as 0:3.

    // VERTEX SHADER
    // Attributes of the vertices.
    // atributes are input parameters.
    // varying are output parameters.
    // void main is the vertex shader that performs all the operations.
    // Second and third parameter are for passing non uniform color from vs to fs.
    const vsText = `
    precision mediump float;
    attribute vec3 vertPosition;
    attribute vec2 vertTextureCoord;
    varying vec2 fragTextureCoord;
    uniform mat4 mWorld;
    uniform mat4 mView;
    uniform mat4 mProjection;

    void main() {
        fragTextureCoord = vertTextureCoord;
        gl_Position = mProjection * mView * mWorld * vec4(vertPosition, 1.0);
    }`;

    // FRAGMENT SHADER
    // Attributes of the pixels between the vertices.
    // varying are not the inputs.
    // the only output for the fs is the gl_FragColor.
    // Second parameter is for passing non uniform color from vs to fs.
    const fsText = `
    precision mediump float;
    varying vec2 fragTextureCoord;
    uniform sampler2D sampler;
    void main() {
        gl_FragColor = texture2D(sampler, fragTextureCoord);
    }`;

    // Activate depth perception.
    gl.enable(gl.DEPTH_TEST);

    // Create shaders.
    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);

    gl.shaderSource(vertexShader, vsText);
    gl.shaderSource(fragmentShader, fsText);

    gl.compileShader(vertexShader);
    if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
        console.error("Error compiling vertex shader", gl.getShaderInfoLog(vertexShader));
        return;
    }

    gl.compileShader(fragmentShader);
    if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
        console.error("Error compiling fragment shader", gl.getShaderInfoLog(fragmentShader));
        return;
    }

    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error("Error linking program", gl.getProgramInfoLog(program));
        return;
    }

    // This is only made in debbug. It's expensive.
    gl.validateProgram(program);
    if (!gl.getProgramParameter(program, gl.VALIDATE_STATUS)) {
        console.error("Error validating program", gl.getProgramInfoLog(program));
        return;
    }

    // Tell WebGL which program should be active to allow the uniform settings. 
    gl.useProgram(program);

    const mWorldUniformLoc = gl.getUniformLocation(program, "mWorld");
    const mViewUniformLoc = gl.getUniformLocation(program, "mView");
    const mProjectionUniformLoc = gl.getUniformLocation(program, "mProjection");

    // Setting the initial values for the matrices that will change.
    let worldMatrix = mat4.create();

    let viewMatrix = mat4.lookAt(mat4.create(), [0, 0, 12], [0, 0, 0], [0, 1, 0]);
    let projectionMatrix = mat4.perspective(mat4.create(), glmat.toRadian(45),
        canvas.width / canvas.height, 0.1, 1000.0);

    // Modify the uniform values in the program.
    gl.uniformMatrix4fv(mWorldUniformLoc, false, mat4.create());
    gl.uniformMatrix4fv(mViewUniformLoc, false, viewMatrix);
    gl.uniformMatrix4fv(mProjectionUniformLoc, false, projectionMatrix);



    const vertexBuffer = gl.createBuffer();
    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    const positionAttribLocation = gl.getAttribLocation(program, "vertPosition");
    const textureCoordAttribLocation = gl.getAttribLocation(program, "vertTextureCoord");
    // Binds the buffer currently bound to gl.ARRAY_BUFFER to a generic vertex attribute 
    // of the current vertex buffer object and specifies its layout.
    gl.vertexAttribPointer(
        positionAttribLocation, //Attribute location.
        4, // Number of elements per attribute.
        gl.FLOAT, // Type of elements.
        false, // Whether or not values are normalized (more on that later).
        6 * Float32Array.BYTES_PER_ELEMENT, // Size of an individual vertex.
        0 // Offset from the beginning of a single vertex to this attribute.
    );
    gl.vertexAttribPointer(
        textureCoordAttribLocation, //Attribute location.
        2, // Number of elements per attribute.
        gl.FLOAT, // Type of elements.
        false, // Whether or not values are normalized (more on that later).
        6 * Float32Array.BYTES_PER_ELEMENT, // Size of an individual vertex.
        4 * Float32Array.BYTES_PER_ELEMENT // Offset from the beginning of a single vertex to this attribute.
    );
    // Enable attribute for use.
    gl.enableVertexAttribArray(positionAttribLocation);
    gl.enableVertexAttribArray(textureCoordAttribLocation);

    // Create texture
    const boxTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, boxTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE,
        document.getElementById('react-logo'))

    gl.bindTexture(gl.TEXTURE_2D, null);

    // 
    // Main render loop.
    // 

    // Memory allocation takes a while. Thus, the variable is declared beforehand.
    let period = 0;
    let identityMatrix = mat4.create();

    const tank = new Cube([0.5, 0.5, 0.3]);

    mat4.rotate(worldMatrix, identityMatrix, Math.PI, [-1, -0.1, 0]);


    const loop = () => {

        // How much time the figure will take to rotate 360 degrees.
        period = performance.now() / 1000 / 40 * 2 * Math.PI;

        // Operating the matrix to rotate in the period, by the y axis.
        // 1, 1, 0
        mat4.rotate(worldMatrix, identityMatrix, period, [-1, 1, 0]);

        gl.uniformMatrix4fv(mWorldUniformLoc, false, worldMatrix);

        // Setting up the color with which one's clears.
        gl.clearColor(0.75, 0.85, 0.8, 1.0);
        // Clearing both the color and the depth.
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        gl.bindTexture(gl.TEXTURE_2D, boxTexture);
        gl.activeTexture(gl.TEXTURE0);

        tank.paint(gl);

        // 1. How we are going to draw.
        // 2. Quantity of elements.
        // 3. Type of elements.
        // 4. Skip.

        // Every time the computer is ready to update it, it will.
        // If tab looses focus the function pauses execution.
        requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
}

function loadTexture(gl, url) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // Because images have to be downloaded over the internet
    // they might take a moment until they are ready.
    // Until then put a single pixel in the texture so we can
    // use it immediately. When the image has finished downloading
    // we'll update the texture with the contents of the image.
    const level = 0;
    const internalFormat = gl.RGBA;
    const width = 1;
    const height = 1;
    const border = 0;
    const srcFormat = gl.RGBA;
    const srcType = gl.UNSIGNED_BYTE;
    const pixel = new Uint8Array([0, 0, 255, 255]);  // opaque blue
    gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
        width, height, border, srcFormat, srcType,
        pixel);

    const image = new Image();
    image.onload = () => {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
            srcFormat, srcType, image);

        // WebGL1 has different requirements for power of 2 images
        // vs non power of 2 images so check if the image is a
        // power of 2 in both dimensions.
        if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
            // Yes, it's a power of 2. Generate mips.
            gl.generateMipmap(gl.TEXTURE_2D);
        } else {
            // No, it's not a power of 2. Turn off mips and set
            // wrapping to clamp to edge
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        }
    };
    image.src = url;

    return texture;
}

function isPowerOf2(value) {
    return value & (value - 1) === 0;
}


// Creates a unitary polygon in XZ plane centered on 0, 0, 0 with a default color.
const createPolygonVertices = (edges, color) => {
    // Each vertex has to be of size 8: X, Y, Z, Position/Direction, R, G, B, Alpha.
    const vertices = new Array((1 + edges) * 8);
    // Vertex 0
    vertices[0] = 0;
    vertices[1] = 0;
    vertices[2] = 0;
    vertices[3] = 1;
    vertices[4] = color[0];
    vertices[5] = color[1];
    vertices[6] = color[2];
    vertices[7] = color[3];
    // Rest of circle.
    let currentAngle = 0;
    const angleIncrement = Math.round(Math.PI / edges * 10000) / 10000;
    for (let i = 0; i < edges; i++) {
        vertices[(i + 1) * 8 + 0] = Math.cos(currentAngle);
        vertices[(i + 1) * 8 + 1] = 0;
        vertices[(i + 1) * 8 + 2] = Math.sin(currentAngle);
        vertices[(i + 1) * 8 + 3] = 1;
        vertices[(i + 1) * 8 + 4] = color[0];
        vertices[(i + 1) * 8 + 5] = color[1];
        vertices[(i + 1) * 8 + 6] = color[2];
        vertices[(i + 1) * 8 + 7] = color[3];
        currentAngle += angleIncrement * 2;
    }
    return vertices;
}

// Creates indices for a circle connected in triangle fan.
const createPolygonIndices = (edges) => {
    const indices = [...Array(edges + 2).keys()];
    indices[edges + 1] = 1;
    return indices;
};


class Figure3D {
    constructor(vertices, indices) {
        this.vertices = vertices;
        this.indices = indices;
    }

    paint(gl, wayOfDrawing) {
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vertices), gl.STATIC_DRAW);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.indices), gl.STATIC_DRAW);
        gl.drawElements(wayOfDrawing, this.indices.length, gl.UNSIGNED_SHORT, 0);
    }

    translate(x, y, z) {
        for (let i = 0; i < this.vertices.length / 8; i++) {
            this.vertices[i * 8] += x;
            this.vertices[i * 8 + 1] += y;
            this.vertices[i * 8 + 2] += z;
        }
    }

    scale = (x, y, z) => {
        for (let i = 0; i < this.vertices.length / 8; i++) {
            this.vertices[i * 8] *= x;
            this.vertices[i * 8 + 1] *= y;
            this.vertices[i * 8 + 2] *= z;
        }
    }

    rotate = (axis, theta) => {
        let original;
        const otherAxis1 = (1 + axis) % 3;
        const otherAxis2 = (2 + axis) % 3;
        for (let i = 0; i < this.vertices.length / 8; i++) {
            original = this.vertices[i * 8 + otherAxis1];
            this.vertices[i * 8 + otherAxis1] = Math.cos(theta) * original
                - Math.sin(theta) * this.vertices[i * 8 + otherAxis2];
            this.vertices[i * 8 + otherAxis2] = Math.sin(theta) * original
                + Math.cos(theta) * this.vertices[i * 8 + otherAxis2];
        }
    }
}

class Cube extends Figure3D {
    constructor(texture) {
        const s = texture[0];
        const t = texture[1];
        const vertices = [
            0.0, 0.0, 0.5, 1.0, 0, 1,
            -0.5, 0.5, 0.5, 1.0, 1, 0,
            -0.5, -0.5, 0.5, 1.0, 0.5, 0.5,
            0.5, -0.5, 0.5, 1.0, 0.5, 0.5,
            0.5, 0.5, 0.5, 1.0, 0, 0,

            0.0, 0.0, -0.5, 1.0, 0, 1,
            -0.5, 0.5, -0.5, 1.0, 1, 0,
            -0.5, -0.5, -0.5, 1.0, 0.5, 0.5,
            0.5, -0.5, -0.5, 1.0, 0.5, 0.5,
            0.5, 0.5, -0.5, 1.0, 0, 0,
        ]
        const indices = [1, 2, 3, 7, 8, 6, 9, 1, 4, 3, 9, 8, 6, 7, 1, 2];
        super(vertices, indices)
    }

    paint(gl) {
        super.paint(gl, gl.TRIANGLE_STRIP);
    }
}

class Cylinder extends Figure3D {
    constructor(quality, color) {
        // Quality no puede ser menor creo que a 2. Igual no tendría sentido que lo fuera.
        const cylinderIndices = (quality) => {
            // Toca iterar de a cada tres cuando es triangle strip.
            const basesIndices = (initialIndex, quality) => {
                const indices = new Array(3 * quality + 2);
                // Solo se transforman los valores iniciales. No se modifican las propiedades
                // del arreglo.
                for (let i = 0; i < quality; i++) {
                    indices[i * 3] = initialIndex
                    indices[i * 3 + 1] = initialIndex + 2 * i + 1
                    indices[i * 3 + 2] = initialIndex + 2 * i + 2
                }
                indices[indices.length - 2] = initialIndex;
                indices[indices.length - 1] = initialIndex + 1;
                return indices;
            }
            const bodyIndices = (quality) => {
                // Cuando es con 10 de quality:
                //2, // Para hacer que empecemos en 1, 2.
                //22, 23, 2,
                //...bodyIndices(),
                //22, 1, // Para terminar de cerrar.
                //41, // Para que baje bien al otro punto.
                const indices = new Array((quality * 2 + 1 - 3) * 2);
                for (let i = 3; i < quality * 2 + 1; i++) {
                    indices[(i - 3) * 2] = i + quality * 2 + 1;
                    indices[(i - 3) * 2 + 1] = i;
                }
                return [2, quality * 2 + 2, quality * 2 + 3, 2, ...indices, quality * 2 + 2, 1, quality * 4 + 1];
            }
            return [...basesIndices(0, quality), ...bodyIndices(quality), ...basesIndices(quality * 2 + 1, quality)];
        }

        super(createPolygonVertices(quality * 2, color), cylinderIndices(quality));
        this.translate(0.0, 1.0, 0.0);
        this.vertices.push(...createPolygonVertices(quality * 2, color));
    }

    paint(gl) {
        super.paint(gl, gl.TRIANGLE_STRIP);
    }
}

class Pyramid extends Figure3D {
    constructor(color) {
        const vertices = createPolygonVertices(4, color);
        vertices[1] = 1.0;
        super(vertices, [0, 1, 2, 3, 0, 4, 1, 3]);
    }

    paint(gl) {
        super.paint(gl, gl.TRIANGLE_STRIP);
    }
}

class ComplexFigure3D {
    constructor(figures) {
        this.figures = figures;
    }

    paint(gl) {
        this.figures.forEach((figure) => figure.paint(gl))
    }

    translate(x, y, z) {
        this.figures.forEach((figure) => figure.translate(x, y, z))
    }

    scale(x, y, z) {
        this.figures.forEach((figure) => figure.scale(x, y, z))
    }

    rotate(axis, theta) {
        this.figures.forEach((figure) => figure.rotate(axis, theta));
    }
}

class Tank extends ComplexFigure3D {
    constructor(mainColor) {
        const llanta1 = new Cylinder(DEFINICION_CIRCULOS, mainColor);
        llanta1.translate(0, -0.5, 0);
        llanta1.rotate(0, Math.PI / 2);
        llanta1.scale(2, 0.5, 2);
        llanta1.translate(0, 0.5, 0);

        const llantaMetal = new Cylinder(DEFINICION_CIRCULOS, [0.66, 0.66, 0.66]);
        llantaMetal.translate(0, -0.5, 0);
        llantaMetal.rotate(0, Math.PI / 2);
        llantaMetal.scale(1.6, 0.3, 2.1);
        llantaMetal.translate(0, 0.5, 0);

        const cabina = new Cube([0.66, 0.66, 0.66]);
        cabina.scale(1.6, 1.6, 1.6)
        cabina.translate(0, 1, 0)

        const canion = new Cylinder(DEFINICION_CIRCULOS, mainColor);
        canion.translate(0, -0.5, 0);
        canion.scale(0.2, 2, 0.2);
        canion.rotate(2, -Math.PI * 3 / 7);
        canion.translate(0.8, 1.4, 0)

        super([llanta1, cabina, canion, llantaMetal])
    }
}

// Esta mondá es de tamaño 2
class Tree extends ComplexFigure3D {
    constructor(colorOfLeaves, colorOfTrunk) {
        const base = new Cylinder(DEFINICION_CIRCULOS, colorOfTrunk);
        base.scale(0.3, 1, 0.3);
        const hojas = new Pyramid(colorOfLeaves);
        hojas.translate(0, 1, 0);
        const hojas2 = new Pyramid(colorOfLeaves);
        hojas2.translate(0, 1.5, 0);
        super([base, hojas, hojas2])
    }
}

class BicicletaDesproporcionada extends ComplexFigure3D {
    constructor(mainColor) {
        const rueda1 = new Cylinder(DEFINICION_CIRCULOS, [0.23, 0.18, 0.18, 1.0]);
        rueda1.scale(1.5, 0.5, 1.5);
        rueda1.rotate(0, Math.PI / 2);
        rueda1.translate(3, -1.5, -0.25)

        const rueda2 = new Cylinder(DEFINICION_CIRCULOS, [0.23, 0.18, 0.18, 1.0]);
        rueda2.scale(1.5, 0.5, 1.5);
        rueda2.rotate(0, Math.PI / 2);
        rueda2.translate(-3, -1.5, -0.25)

        const rin1 = new Cylinder(DEFINICION_CIRCULOS, [1, 1, 1])
        rin1.scale(1.1, 0.6, 1.1)
        rin1.rotate(0, Math.PI / 2);
        rin1.translate(0, 0, -0.32)
        rin1.translate(3, -1.5, 0)

        const rin2 = new Cylinder(DEFINICION_CIRCULOS, [1, 1, 1])
        rin2.scale(1.1, 0.6, 1.1)
        rin2.rotate(0, Math.PI / 2);
        rin2.translate(0, 0, -0.32)
        rin2.translate(-3, -1.5, 0)

        const paloBase = new Cube(mainColor);
        paloBase.scale(6, 1, 1);

        const paloMango1 = new Cube(mainColor);
        paloMango1.scale(1, 3, 1)
        paloMango1.translate(2.5, 1, 0)

        const paloMango2 = new Cube(mainColor);
        paloMango2.scale(0.5, 0.5, 4)
        paloMango2.translate(2.5, 1.75, 0)

        const baseAsiento = new Cube([0.66, 0.66, 0.66])
        baseAsiento.scale(0.25, 0.5, 0.25);
        baseAsiento.translate(0, 0.75, 0)

        const asiento = new Cube([0.66, 0.66, 0.66])
        asiento.scale(1.25, 0.25, 1)
        asiento.translate(0, 1, 0)

        super([rueda1, rueda2, rin1, rin2, paloBase, paloMango1, paloMango2, baseAsiento, asiento]);
    }
}

// Bicicleta de casi tamaño 1 :p
class Bycicle extends ComplexFigure3D {
    constructor(mainColor) {
        const modelo = new BicicletaDesproporcionada(mainColor);
        modelo.scale(0.33, 0.33, 0.33)
        modelo.translate(0, 0.99, 0)
        super(modelo.figures);
    }
}

// Humano de tamaño 1
class Person extends ComplexFigure3D {
    constructor(clotheColor, pantColor, skinColor) {
        const cuerpo = new Cube(clotheColor);
        cuerpo.scale(0.5, 0.4, 0.5)
        cuerpo.translate(0, 0.6, 0)
        const pantalones = new Cube(pantColor)
        pantalones.scale(0.5, 0.4, 0.5)
        pantalones.translate(0, 0.2, 0)
        const cabeza = new Cylinder(DEFINICION_CIRCULOS, skinColor)
        cabeza.scale(0.2, 0.2, 0.2)
        cabeza.translate(0, 0.8, 0)
        super([cuerpo, pantalones, cabeza])
    }
}

class Table extends ComplexFigure3D {
    constructor(color) {
        const pata = new Cube(color);
        pata.scale(0.2, 1, 0.2);
        pata.translate(0, 0.5, 0);

        const mesa = new Cube(color);
        mesa.scale(1, 0.1, 1)
        mesa.translate(0, 1, 0);

        super([pata, mesa])
    }
}

class Grave extends ComplexFigure3D {
    constructor(color) {
        const base = new Cube(color);
        base.scale(1, 0.5, 0.3);
        base.translate(0, 0.25, 0);

        const tapa = new Cylinder(DEFINICION_CIRCULOS, color);
        tapa.translate(0, -0.5, 0);
        tapa.rotate(0, Math.PI / 2);
        tapa.scale(0.5, 0.5, 0.3);
        tapa.translate(0, 0.5, 0);

        super([base, tapa]);
    }
}

class Cake extends ComplexFigure3D {
    constructor(baseColor, creamColor) {
        const piso1 = new Cylinder(DEFINICION_CIRCULOS, baseColor);
        piso1.translate(0, -0.5, 0);
        piso1.scale(0.5, 0.2, 0.5);
        piso1.translate(0, 0.1, 0);

        const crema1 = new Cylinder(DEFINICION_CIRCULOS, creamColor);
        crema1.translate(0, -0.5, 0);
        crema1.scale(0.5, 0.1, 0.5);
        crema1.translate(0, 0.25, 0);

        const piso2 = new Cylinder(DEFINICION_CIRCULOS, baseColor);
        piso2.translate(0, -0.5, 0);
        piso2.scale(0.35, 0.2, 0.35);
        piso2.translate(0, 0.4, 0);

        const crema2 = new Cylinder(DEFINICION_CIRCULOS, creamColor);
        crema2.translate(0, -0.5, 0);
        crema2.scale(0.35, 0.1, 0.35);
        crema2.translate(0, 0.55, 0);

        const piso3 = new Cylinder(DEFINICION_CIRCULOS, baseColor);
        piso3.translate(0, -0.5, 0);
        piso3.scale(0.20, 0.2, 0.20);
        piso3.translate(0, 0.7, 0);

        const crema3 = new Cylinder(DEFINICION_CIRCULOS, creamColor);
        crema3.translate(0, -0.5, 0);
        crema3.scale(0.20, 0.1, 0.20);
        crema3.translate(0, 0.85, 0);

        const vela = new Cylinder(DEFINICION_CIRCULOS, [0.95, 1, 1]);
        vela.translate(0, -0.5, 0);
        vela.scale(0.05, 0.2, 0.05);
        vela.translate(0, 1, 0);

        const fuego = new Cylinder(DEFINICION_CIRCULOS, [1, 0.5, 0]);
        fuego.translate(0, -0.5, 0);
        fuego.scale(0.07, 0.1, 0.07);
        fuego.translate(0, 1.1, 0);

        super([piso1, piso2, piso3, crema1, crema2, crema3, vela, fuego]);
    }
}

class BirthdayHat extends ComplexFigure3D {
    constructor(baseColor, pompomColor) {
        const base = new Pyramid(baseColor);
        base.scale(0.6, 1, 0.6);

        const pompom = new Cube(pompomColor);
        pompom.scale(0.4, 0.4, 0.4);
        pompom.translate(0, 1, 0);

        super([base, pompom]);
    }
}

main();