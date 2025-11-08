(function () {
	"use strict";

	var viewport = document.getElementById("satelites-jupiter-viewport");
	var sliderWrapper = document.querySelector("#sat-slider-wrapper .label-data-slider");
	var sliderInput = window.jQuery ? window.jQuery("#slider-data") : null;
	var toggleOrbitsBtn = document.getElementById("btn-toggle-orbitas");
	var exportBtn = document.getElementById("btn-exportar-eventos");
	var debugBtn = document.getElementById("sat-debug-toggle");
	var statusLog = document.getElementById("status-log");

	var worker = null;
	var samples = [];
	var currentIndex = 0;
	var system = null;
	var sliderInitialized = false;
	var pendingSamples = null;
	var trailsEnabled = true;
	var initialized = false;
	var cameraRef = null;
	var cameraControlRef = null;
	var cameraPrimed = false;

	function log(message) {
		if (!statusLog) {
			return;
		}
		var entry = document.createElement("div");
		entry.textContent = "[" + new Date().toLocaleTimeString() + "] " + message;
		statusLog.appendChild(entry);
		statusLog.scrollTop = statusLog.scrollHeight;
	}

	function toggleLog() {
		if (!statusLog) {
			return;
		}
		if (statusLog.style.display === "none" || statusLog.style.display === "") {
			statusLog.style.display = "block";
		} else {
			statusLog.style.display = "none";
		}
	}

	function mapBodies(sample) {
		var mapped = {};
		(sample?.bodies ?? []).forEach(function (body) {
			if (!body || !body.name) {
				return;
			}
			mapped[body.name.toLowerCase()] = body;
		});
		return mapped;
	}

	function prepareSamples(payload) {
		var baseJd = payload?.julianDay ?? 0;
		var hoursBefore = payload?.hoursBefore ?? 0;
		var stepMinutes = payload?.stepMinutes ?? 60;
		var stepHours = stepMinutes / 60.0;
		var startJd = baseJd - hoursBefore / 24.0;

		samples = (payload?.samples ?? []).map(function (sample, index) {
			var jd = sample?.julianDay ?? (startJd + index * stepHours / 24.0);
			return {
				jd: jd,
				offsetHours: (jd - baseJd) * 24.0,
				state: mapBodies(sample)
			};
		});

		pendingSamples = samples;

		log("Worker retornou " + samples.length + " amostras.");
		if (samples.length === 0) {
			return;
		}

		if (system && typeof system.setSamples === "function") {
			system.setSamples(pendingSamples);
		}

		currentIndex = Math.floor(samples.length / 2);
		updateSlider();
		applySample();
	}

	function updateSlider() {
		if (!sliderInput || samples.length === 0) {
			return;
		}

		sliderInput.off('slide');
		sliderInput.off('slideStop');

		if (sliderInitialized) {
			sliderInput.bootstrapSlider('destroy');
			sliderInitialized = false;
		}

		sliderInput.bootstrapSlider({
			min: 0,
			max: samples.length - 1,
			value: currentIndex,
			step: 1
		});
		sliderInitialized = true;

		sliderInput.on('slide', function (evt) {
			setIndex(evt.value);
		});

		sliderInput.on('slideStop', function (evt) {
			setIndex(evt.value);
		});
	}

	function setIndex(index) {
		if (samples.length === 0) {
			return;
		}
		currentIndex = Math.max(0, Math.min(index, samples.length - 1));
		if (sliderInitialized && sliderInput) {
			try {
				sliderInput.bootstrapSlider('setValue', currentIndex, false, false);
			} catch (err) {
				// ignore slider sync errors
			}
		}
		applySample();
	}

	function applySample() {
		var sample = samples[currentIndex];
		if (!sample || !system) {
			return;
		}

		var state = sample.state;
		state.sun = state.sun || state['sun'];
		state.earth = state.earth || state['earth'];

		log("Aplicando amostra index " + currentIndex + " jd " + sample.jd.toFixed(5));
		system.update({ jd: sample.jd, state: state });
		primeCamera();

		if (sliderWrapper) {
			var fuso = typeof obterFusoHorario === "function" ? obterFusoHorario() : 0;
			var data = ON_DAED && ON_DAED.formatarDataJuliana ? ON_DAED.formatarDataJuliana(sample.jd, fuso) : ("JD " + sample.jd.toFixed(5));
			sliderWrapper.textContent = data;
		}
	}

	function initWorker() {
		if (worker) {
			return;
		}

		try {
			worker = new Worker("lib/on-daed-js/workers/satelites-jupiter-worker.js");
		} catch (err) {
			log("Falha ao iniciar worker: " + err);
			return;
		}

		worker.addEventListener("message", function (event) {
			var type = event.data?.type;
			var payload = event.data?.payload;
			switch (type) {
				case "ready":
					log(payload?.message ?? "Worker pronto.");
					break;
				case "samples":
					prepareSamples(payload);
					break;
				case "error":
				default:
					log("Worker: " + (payload?.message ?? "erro desconhecido"));
					break;
			}
		});

		worker.postMessage({ type: "initialize" });
	}

	function requestSamples(jd) {
		initWorker();
		if (!worker) {
			return;
		}
		worker.postMessage({ type: "computeSamples", payload: { jd: jd, spanHours: 360, stepMinutes: 60 } });
	}

	function initScene() {
		if (!viewport || !ON_DAED || !ON_DAED["3D"]) {
			log("Cena não inicializada: viewport? " + (!!viewport) + ", ON_DAED? " + (!!ON_DAED));
			return;
		}

		log("Iniciando cena Three.js");

		ON_DAED["3D"].create(function (scene, camera) {
			scene.background = new THREE.Color(0x000000);
			camera.position.set(0, -300000, 450000);
			camera.lookAt(new THREE.Vector3(0, 0, 0));

			system = new ON_DAED["3D"].JupiterSatellitesV2(scene);
			if (typeof system.setTrailsVisible === "function") {
				system.setTrailsVisible(trailsEnabled);
			}
			if (pendingSamples && typeof system.setSamples === "function") {
				system.setSamples(pendingSamples);
			}
			cameraRef = camera;

		}, function (cameraControl, renderer, scene, camera, stats, clock) {
			if (cameraControl) {
				cameraControl.enabled = true;
				cameraControl.update(clock.getDelta());
			}
			if (system) {
				system.update(samples[currentIndex]);
			}
			renderer.render(scene, camera);
			cameraControlRef = cameraControl;

		}, viewport, function (camera, renderer) {
			var control = new THREE.OrbitControls(camera, renderer.domElement);
			control.maxDistance = 125000;
			control.minDistance = 1000;
			return control;
		}, 0x000000);

		log("Cena criada, aguardando worker.");
	}

	function updateOrbitToggleLabel() {
		if (!toggleOrbitsBtn) {
			return;
		}
		toggleOrbitsBtn.textContent = trailsEnabled ? "Desligar Órbitas" : "Ligar Órbitas";
	}

	function initUI() {
		if (toggleOrbitsBtn) {
			toggleOrbitsBtn.addEventListener("click", function () {
				trailsEnabled = !trailsEnabled;
				if (system && typeof system.setTrailsVisible === "function") {
					system.setTrailsVisible(trailsEnabled);
				}
				updateOrbitToggleLabel();
			});
		}

		if (exportBtn) {
			exportBtn.addEventListener("click", function () {
				log("Exportação ainda não implementada nesta fase.");
			});
		}

		if (debugBtn) {
			debugBtn.addEventListener("click", toggleLog);
		}

		if (statusLog) {
			statusLog.style.display = "none";
		}

		updateOrbitToggleLabel();
		log("UI inicializada.");
	}

	function init() {
		if (initialized) {
			return;
		}
		initialized = true;

		log("Inicializando página Satélites de Júpiter v2.");

		initScene();
		initWorker();
		initUI();

		var now = new Date();
		var jd = (now.getTime() / 86400000) + 2440587.5;
		requestSamples(jd);
		log("Solicitando amostras para JD " + jd.toFixed(5));
	}

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", init);
	} else {
		init();
	}

	function primeCamera() {
		if (cameraPrimed || !cameraRef || !system || typeof system.getSunCameraPosition !== "function") {
			return;
		}
		var sunPos = system.getSunCameraPosition();
		if (!sunPos) {
			return;
		}
		if (sunPos.lengthSq() === 0) {
			sunPos.set(0, 0, 200);
		}
		cameraRef.position.copy(sunPos);
		cameraRef.lookAt(new THREE.Vector3(0, 0, 0));
		cameraRef.fov = 0.208;
		cameraRef.updateProjectionMatrix();
		if (cameraControlRef) {
			cameraControlRef.update();
		}
		cameraPrimed = true;
		log("Câmera posicionada na direção do Sol.");
	}

})();
