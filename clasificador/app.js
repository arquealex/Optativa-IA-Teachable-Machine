// rutas del modelo exportado de Teachable Machine
const rutaModelo = "modelo/model.json";
const rutaMetadatos = "modelo/metadata.json";

// mensaje que se muestra según la clase ganadora
const mensajes = {
    "Class 1": "Veo un móvil",
    "Class 2": "Veo una botella"
};
const mensajeSinCoincidencia = "No reconozco ningún objeto";

let modelo;
let webcam;
let totalClases;
let funcionando = false;
let idAnimacion;
let ultimoTexto = "";

// elementos de la página
const btnIniciar = document.getElementById("btnIniciar");
const btnParar = document.getElementById("btnParar");
const btnBorrar = document.getElementById("btnBorrar");
const inputImagen = document.getElementById("inputImagen");
const rangoUmbral = document.getElementById("rangoUmbral");
const valorUmbral = document.getElementById("valorUmbral");
const contenedorWebcam = document.getElementById("contenedor-webcam");
const imagenSubida = document.getElementById("imagenSubida");
const parrafoMensaje = document.getElementById("mensaje");
const contenedorResultado = document.getElementById("resultado");
const historico = document.getElementById("historico");

// el modelo se carga una sola vez al abrir la página
async function cargarModelo() {
    parrafoMensaje.innerHTML = "Cargando modelo...";

    try {
        modelo = await tmImage.load(rutaModelo, rutaMetadatos);
    } catch (error) {
        parrafoMensaje.innerHTML = "Error al cargar el modelo";
        console.log(error);
        return;
    }

    totalClases = modelo.getTotalClasses();

    // un div por cada clase para mostrar el resultado
    for (let i = 0; i < totalClases; i++) {
        contenedorResultado.appendChild(document.createElement("div"));
    }

    parrafoMensaje.innerHTML = "";
    btnIniciar.disabled = false;
    inputImagen.disabled = false;
}

async function iniciar() {
    if (funcionando) {
        return;
    }

    btnIniciar.disabled = true;
    imagenSubida.hidden = true;
    limpiarResultado();
    ultimoTexto = "";

    try {
        // la webcam se crea de nuevo cada vez que se inicia
        webcam = new tmImage.Webcam(300, 300, true);
        await webcam.setup();
        await webcam.play();
    } catch (error) {
        parrafoMensaje.innerHTML = "No se ha podido encender la cámara";
        btnIniciar.disabled = false;
        return;
    }

    contenedorWebcam.appendChild(webcam.canvas);
    funcionando = true;
    btnParar.disabled = false;
    idAnimacion = window.requestAnimationFrame(bucle);
}

function parar() {
    if (!funcionando) {
        return;
    }

    funcionando = false;
    window.cancelAnimationFrame(idAnimacion);

    // apagar la cámara y limpiar la pantalla
    webcam.stop();
    contenedorWebcam.innerHTML = "";
    limpiarResultado();

    btnParar.disabled = true;
    btnIniciar.disabled = false;
}

async function bucle() {
    if (!funcionando) {
        return;
    }

    webcam.update();
    const prediccion = await modelo.predict(webcam.canvas);

    // por si se ha pulsado parar mientras predecía
    if (!funcionando) {
        return;
    }

    const texto = mostrarResultado(prediccion);

    // en el histórico solo se apunta cuando cambia el resultado
    if (texto !== ultimoTexto) {
        anotarHistorico(texto);
        ultimoTexto = texto;
    }

    idAnimacion = window.requestAnimationFrame(bucle);
}

// escribe los porcentajes y el mensaje, y devuelve el texto del mensaje
function mostrarResultado(prediccion) {
    const umbral = Number(rangoUmbral.value) / 100;
    let ganadora = prediccion[0];

    for (let i = 0; i < totalClases; i++) {
        const porcentaje = (prediccion[i].probability * 100).toFixed(0);
        contenedorResultado.childNodes[i].innerHTML = prediccion[i].className + ": " + porcentaje + "%";

        if (prediccion[i].probability > ganadora.probability) {
            ganadora = prediccion[i];
        }
    }

    let texto;
    if (ganadora.probability >= umbral) {
        texto = mensajes[ganadora.className] || "Veo " + ganadora.className;
        parrafoMensaje.className = "coincidencia";
    } else {
        texto = mensajeSinCoincidencia;
        parrafoMensaje.className = "sin-coincidencia";
    }

    parrafoMensaje.innerHTML = texto;
    return texto;
}

function limpiarResultado() {
    for (let i = 0; i < contenedorResultado.childNodes.length; i++) {
        contenedorResultado.childNodes[i].innerHTML = "";
    }
    parrafoMensaje.innerHTML = "";
    parrafoMensaje.className = "";
}

function anotarHistorico(texto) {
    const hora = new Date().toLocaleTimeString();
    const elemento = document.createElement("li");
    elemento.innerHTML = hora + " - " + texto;

    // lo más reciente arriba
    historico.prepend(elemento);

    // máximo 20 apuntes
    while (historico.children.length > 20) {
        historico.removeChild(historico.lastChild);
    }
}

function subirImagen() {
    const archivo = inputImagen.files[0];
    if (!archivo) {
        return;
    }

    // si la cámara estaba encendida, se apaga
    parar();

    imagenSubida.onload = async function () {
        const prediccion = await modelo.predict(imagenSubida);
        const texto = mostrarResultado(prediccion);
        anotarHistorico("Imagen subida (" + archivo.name + "): " + texto);
    };

    imagenSubida.src = URL.createObjectURL(archivo);
    imagenSubida.hidden = false;

    // para poder volver a subir el mismo archivo
    inputImagen.value = "";
}

btnIniciar.addEventListener("click", iniciar);
btnParar.addEventListener("click", parar);
btnBorrar.addEventListener("click", function () {
    historico.innerHTML = "";
});
inputImagen.addEventListener("change", subirImagen);
rangoUmbral.addEventListener("input", function () {
    valorUmbral.innerHTML = rangoUmbral.value;
});

cargarModelo();
