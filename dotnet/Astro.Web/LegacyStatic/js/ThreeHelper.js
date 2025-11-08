ThreeHelper = {};
(function () {

    function disposeTextures(material) {
        if (material.map) {
            material.map.dispose();
        }

        if (material.envMap) {
            material.envMap.dispose();
        }

        if (material.specularMap) {
            material.specularMap.dispose();
        }
    }

    ThreeHelper.dispose = function (ele, disposeTexture) {

        for (var i = 0; i < ele.children.length; i++) {
            ThreeHelper.dispose(ele.children[i], disposeTexture);
        }

        if (ele.geometry !== null) {
            ele.geometry.dispose();
        }

        if (disposeTexture) {
            if (ele.material instanceof THREE.MeshFaceMaterials) {
                for (var i = 0; i < ele.material.materials.length; i++) {
                    disposeTextures(ele.material.materials[i]);
                }
            } else {
                disposeTextures(ele.material);
            }
        }

        ele.material.dispose();

        delete ele;
    };

})();

ThreeHelper.getWorldCoords = function (element, camera) {
    var coords = new THREE.Vector3();
    var projector = new THREE.Projector();
    coords.x = ((element.offsetLeft + element.offsetWidth) / window.innerWidth) * 2 - 1;
    coords.y = -((element.offsetTop + element.offsetHeight) / window.innerHeight) * 2 + 1;

    coords.ix = (element.offsetLeft / window.innerWidth) * 2 - 1;
    coords.iy = -(element.offsetTop / window.innerHeight) * 2 + 1;

    var ret = {};
    ret.endCoords = new THREE.Vector3(coords.x, coords.y, 0.5);
    projector.unprojectVector(ret.endCoords, camera);

    ret.beginCoords = new THREE.Vector3(coords.ix, coords.iy, 0.5);
    projector.unprojectVector(ret.beginCoords, camera);
    return ret;
};

ThreeHelper.getWindowCoords = function (display, camera, reference) {
    var vector = new THREE.Vector3();
    if (display) {
        var width = reference ? reference.offsetWidth : window.innerWidth,
                height = reference ? reference.offsetHeight : window.innerHeight;
        var widthHalf = width / 2, heightHalf = height / 2;

        vector.setFromMatrixPosition(display.matrixWorld).project(camera);

        vector.x = Math.round((vector.x * widthHalf) + widthHalf);
        vector.y = Math.round(-(vector.y * heightHalf) + heightHalf);

    }
    return vector;
};

// src: http://stackoverflow.com/questions/17624021/determine-if-a-mesh-is-visible-on-the-viewport-according-to-current-camera
ThreeHelper.checkInCamera = function (object, camera) {
    var frustum = new THREE.Frustum();
    var cameraViewProjectionMatrix = new THREE.Matrix4();

// every time the camera or objects change position (or every frame)

    camera.updateMatrixWorld(); // make sure the camera matrix is updated
    camera.matrixWorldInverse.getInverse(camera.matrixWorld);
    cameraViewProjectionMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustum.setFromMatrix(cameraViewProjectionMatrix);

// frustum is now ready to check all the objects you need

    return frustum.intersectsObject(object);
};

(function () {
    var textList = [];

    function labelText(text, position, color, zindex) {
        if (color !== undefined) {
            color = color.toString(16);
            for (var i = color.length; i < 6; i++) {
                color = '0' + color;
            }
            color = '#' + color;
        } else {
            color = '#FFFFFF';
        }

        var span = document.createElement('span');
        span.style.position = 'absolute';
        span.style['z-index'] = zindex || 900;
        span.style.color = color;
        span.innerHTML = text;
        span.className = 'hover-label-text';
        $('canvas:first').parent()[0].appendChild(span);
        span.style.left = (((position.x - span.offsetWidth / 2) / window.innerWidth) * 100) + '%';
        span.style.top = (((position.y - span.offsetHeight / 2) / window.innerHeight) * 100) + '%';
        return span;
    }

    ThreeHelper.removeLabelText = function (uuid) {
        if (textList[uuid]) {
            $(textList[uuid].elem).remove();
            delete textList[uuid];
        }
    };

    ThreeHelper.removeAllTexts = function () {
        for (var i in textList) {
            ThreeHelper.removeLabelText(i);
        }
    };

    ThreeHelper.updateText = function (camera, reference) {
        for (var i in textList) {
            var span = textList[i].elem;
            var frameWidth = reference ? reference.offsetWidth : window.innerWidth;
            var frameHeight = reference ? reference.offsetHeight : window.innerHeight;

            var checkedObject = textList[i].display instanceof THREE.Object3D ?
                    (textList[i].display.children[0] instanceof THREE.Mesh ? textList[i].display.children[0]
                            : null) : textList[i].display;

            var inScene = true;

            if (checkedObject !== null) {
                inScene = ThreeHelper.checkInCamera(checkedObject, camera);
            }

            if (inScene) {
                var position = ThreeHelper.getWindowCoords(textList[i].display, camera, reference);

                if (!isNaN(position.x)) {
                    span.style.left = (((position.x - span.offsetWidth / 2) / frameWidth) * 100) + '%';
                    span.style.top = (((position.y - span.offsetHeight / 2) / frameHeight) * 100) + '%';
                }
            } else {
                span.style.left = '-100%';
                span.style.top = '-100%';
            }
        }
    };

    ThreeHelper.updateLabel = function (display, newLabel) {
        if (textList[display.uuid]) {
            textList[display.uuid].elem.innerHTML = newLabel;
        }
    };

    ThreeHelper.transferLabel = function (display, transfer) {
        if (textList[display.uuid]) {
            var o = textList[display.uuid];
            delete textList[display.uuid];
            o.display = transfer;

            window.setTimeout(function () {
                textList[transfer.uuid] = o;
            }, 1);
        }
    };

    ThreeHelper.createLabel = function (text, display, camera) {
        if (text && display) {
            if (textList[display.uuid]) {
                ThreeHelper.removeLabelText(display.uuid);
            }

            var position = ThreeHelper.getWindowCoords(display, camera);

            if (!isNaN(position.x)) {
                textList[display.uuid] = {elem: labelText(text, position, 0xFFFFFF, 100), display: display};
            } else {
                textList[display.uuid] = {elem: labelText(text, new THREE.Vector3(), 0xFFFFFF, 100), display: display};
                $(textList[display.uuid].elem).hide();
            }

            return textList[display.uuid].elem;
        }
    };
}());



ThreeHelper.createSkybox = function (scene, completeCallback, errorCallback, path, ext, follow) {
    var fragmentShader = "uniform samplerCube tCube;" +
            "uniform samplerCube tCube2;" +
            "uniform float tFlip;" +
            "varying vec3 vWorldPosition;" +
            "varying vec2 vUv;" +
            "varying vec3 vViewPosition;" +
            "float rand(vec2 co){" +
            "    return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);" +
            "}" +
            "void main() {" +
            "       vec4 res1 = textureCube( tCube, vec3( tFlip * vWorldPosition.x, vWorldPosition.yz ) );" +
            "        vec4 res2 = textureCube( tCube2, vec3( tFlip * vWorldPosition.x, vWorldPosition.yz ) );" +
            "        gl_FragColor = vec4( vWorldPosition.x > 0.0 ? res1.x : res2.x, vWorldPosition.x > 0.0 ? res1.y : res2.y, vWorldPosition.x > 0.0 ? res1.z : res2.z, 1.0 ) ;" +
            "}";

    var vertexShader = "varying vec3 vWorldPosition;" +
            "varying vec2 vUv;" +
            "varying vec3 vViewPosition;" +
            "void main() {" +
            "    vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );" +
            "    vec4 worldPosition = modelMatrix * vec4( position, 1.0 );" +
            "    vUv = uv;" +
            "    vWorldPosition = worldPosition.xyz;" +
            "    vViewPosition = -mvPosition.xyz;" +
            "    gl_Position = (projectionMatrix * modelViewMatrix * vec4( position , 0.0 )).xyww;" +
            "}";

    ext = ext || "jpg";
    path = path || "images/bg/";
    var urlPrefix = path + "/";
    var urls = [urlPrefix + "posx." + ext, urlPrefix + "negx." + ext,
        urlPrefix + "posy." + ext, urlPrefix + "negy." + ext,
        urlPrefix + "posz." + ext, urlPrefix + "negz." + ext];
    var textureCube = THREE.ImageUtils.loadTextureCube(urls, undefined, function (tCube) {
        if (completeCallback instanceof Function) {
            completeCallback(tCube);
        }
    }, errorCallback);
    var shader = THREE.ShaderLib.cube;
    var uniforms = THREE.UniformsUtils.clone(shader.uniforms);
    uniforms['tCube'].value = textureCube;
    var material = new THREE.ShaderMaterial({
        fragmentShader: shader.fragmentShader,
        vertexShader: follow ? vertexShader : shader.vertexShader,
        uniforms: uniforms,
        side: THREE.BackSide
    });
    var skybox = new THREE.Mesh(
            new THREE.CubeGeometry(4000, 4000, 4000),
            material);
    scene.add(skybox);
    return textureCube;
};
ThreeHelper.getRawWorldCoords = function (x, y, camera) {
    var coords = new THREE.Vector3();
    var projector = new THREE.Projector();
    coords.x = (x / window.innerWidth) * 2 - 1;
    coords.y = -(y / window.innerHeight) * 2 + 1;
    var ret = new THREE.Vector3(coords.x, coords.y, 0.5);
    projector.unprojectVector(ret, camera);
    return ret;
};
ThreeHelper.createBackground = function (scene, camera, backgroundCallback) {
    var sizeX = window.screen.width;
    var sizeY = window.screen.height;
    var background = {
        loadImage: function (image, sizeX, sizeY) {
            var plane = new THREE.PlaneGeometry();
            this.updatePlane = function () {
                plane.vertices[0] = ThreeHelper.getRawWorldCoords(0, 0, this.camera);
                plane.vertices[1] = ThreeHelper.getRawWorldCoords(window.innerWidth, 0, this.camera);
                plane.vertices[2] = ThreeHelper.getRawWorldCoords(0, window.innerHeight, this.camera);
                plane.vertices[3] = ThreeHelper.getRawWorldCoords(window.innerWidth, window.innerHeight, this.camera);
                plane.verticesNeedUpdate = true;
            };
            this.updatePlane();
            this.texture = THREE.ImageUtils.loadTexture(image, new THREE.UVMapping(), function () {
                console.log('Background Image Loaded');
            }, function () {
                console.error('Error on loading Background Image');
            });
            var planeMesh = new THREE.Mesh(plane, new THREE.MeshBasicMaterial({side:
                        THREE.FrontSide, depthTest: false,
                depthWrite: false,
                map: this.texture}));
            this.scene.add(planeMesh);
            this.camera.lookAt(planeMesh.position);
            this.camera.position.z = 100;
        },
        load: backgroundCallback,
        scene: new THREE.Scene(),
        camera: new THREE.PerspectiveCamera(45, sizeX / sizeY, 0.01, 10000)
    };
    background.load(sizeX, sizeY);
    background.resize = function () {
        var WIDTH = window.screen.width;
        var HEIGHT = window.screen.height;
        background.camera.aspect = WIDTH / HEIGHT;
        background.camera.updateProjectionMatrix();
        var sizeX = WIDTH;
        var sizeY = HEIGHT;
        if (background.updatePlane instanceof Function) {
            background.updatePlane();
        }

        if (background.contentResize instanceof Function) {
            background.contentResize(sizeX, sizeY);
        }
    };
    return background;
};

/* SRC: stemkoski.github.io/Three.js/Shader-Glow.html */
ThreeHelper.glowMaterial = function (cameraPosition) {
    return new THREE.ShaderMaterial(
            {
                uniforms:
                        {
                            "c": {type: "f", value: 1.0},
                            "p": {type: "f", value: 1.4},
                            glowColor: {type: "c", value: new THREE.Color(0xffff00)},
                            viewVector: {type: "v3", value: cameraPosition}
                        },
                vertexShader: "uniform vec3 viewVector;\
                uniform float c;\
                uniform float p;\
                varying float intensity;\
                void main()\
                {\
                vec3 vNormal = normalize(normalMatrix * normal);\
                        vec3 vNormel = normalize(normalMatrix * viewVector);\
                        intensity = pow(c - dot(vNormal, vNormel), p);\
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);\
                        }",
                fragmentShader: "uniform vec3 glowColor;\
                    varying float intensity;\
                    void main() \
                    {\
                            vec3 glow = glowColor * intensity;\
                        gl_FragColor = vec4( glow, 1.0 );\
                    }",
                side: THREE.FrontSide,
                blending: THREE.AdditiveBlending,
                transparent: true
            });
};

ThreeHelper.findCallbackObject = function (object, callback) {
    var parent;

    if (object instanceof THREE.Mesh || object instanceof THREE.Object3D) {
        parent = object;
        while (parent && !parent.ownParent && !(parent.parent instanceof THREE.Scene)) {
            parent = parent.parent;
            if (parent[callback] instanceof Function) {
                break;
            }
        }
    }

    return parent;
};

ThreeHelper.invalidIntersection = function (intersections) {
    for (var i = 0; i < intersections.length; i++) {
        if (intersections[i].object.parent instanceof THREE.Object3D && intersections[i].object.parent.parent) {
            return i;
        }
    }

    return -1;
};
