import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js"; // for PC
import { ARButton } from "three/addons/webxr/ARButton.js";
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let camera, scene, renderer;
let controller1, controller2;
let raycaster;
let group;

/** 光線と交差しているオブジェクト */
const intersected = [];
const tempMatrix = new THREE.Matrix4();

// ウィンドウサイズを変えた時の処理
const onWindowResize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
};

/** 光線の原点から交差点までの距離 (触っているかどうか) */
const isTouch = (intersection) => {
    const d = intersection.distance;
    return d > 0 && d < .10;
};

/** トリガーを引いた時 */
const onSelectStart = (event) => {
    const controller = event.target;
    const intersections = getIntersections(controller);
    const objects = [];
    for (const intersection of intersections) {
        const object = intersection.object;
        // コントローラーに付与 (付随して動かすようにする)
        controller.attach(object);
        objects.push(object);
        if (isTouch(intersection)) {
        break;
        }
    }
    // 選択状態のオブジェクトとして登録する
    controller.userData.selected = objects;
};

/** トリガーを離した時 */
const onSelectEnd = (event) => {
    const controller = event.target;
    if (controller.userData.selected !== undefined) {
        // 選択状態となっていたオブジェクトに対して
        for (const object of controller.userData.selected) {
        // 空間に再配置する
        group.attach(object);
        }
        // 選択状態のオブジェクトを解除
        controller.userData.selected = undefined;
    }
};

/** 光線とぶつかったオブジェクトを得る */
const getIntersections = (controller) => {
    tempMatrix.identity().extractRotation(controller.matrixWorld);
    raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
    // 光線とぶつかったオブジェクトを得る
    return raycaster.intersectObjects(group.children, false);
};

const intersectObjects = (controller) => {
    if (controller.userData.selected !== undefined) return;
    // 光線とぶつかったオブジェクトをに対して処理
    const intersections = getIntersections(controller);
    for (const intersection of intersections) {
        const object = intersection;
        intersected.push(object);
        // 触っていたら
        if (isTouch(intersection)) {
        break;
        }
    }
};

/** 描画処理 */
const render = () => {
    intersectObjects(controller1);
    intersectObjects(controller2);
    renderer.render(scene, camera);
};

/** レンダリングを開始する */
const animate = () => {
    renderer.setAnimationLoop(render);
};

const loadParts = () => {
    /** GLTFファイルローダー */
    const loader = new GLTFLoader();
    /** モデルのURL */
    const modelsUrls = ['./glb/dollA.glb', './glb/dollB.glb', './glb/dollC.glb', './glb/dollD.glb', './glb/dollE.glb', './glb/dollF.glb', './glb/dollG.glb']
    // モデルをロードして配置
    const loadModels = (url) => {
        loader.load(url, gltf => {
        const object = gltf.scene;
        object.traverse(function (child) {
            if (child.isMesh) {
            let num = Math.random() * (10 - 5) + 5;
            child.position.x = Math.random() * (2 + 2) - 2;
            child.position.y = Math.random() * (2 + 2) - 2;
            child.position.z = Math.random() * (2 + 2) - 2;
            child.rotation.x = Math.random() * 90;
            child.rotation.y = Math.random() * 90;
            child.rotation.z = Math.random() * 90;
            child.scale.x = num;
            child.scale.y = num;
            child.scale.z = num;
            group.add(child);
            }
        }, undefined, () => {});
        })
    }
    modelsUrls.forEach(part => loadModels(part))
}

/** 空間を初期化 */
const initScene = () => {
    const container = document.createElement("div");
    document.body.appendChild(container);

    // 空間を作成
    scene = new THREE.Scene();

    // カメラを設定
    camera = new THREE.PerspectiveCamera(
        50,
        window.innerWidth / window.innerHeight,
        0.1,
        10,
    );
    camera.position.set(0, 0, 3);

    // カメラ範囲を設定
    const controls = new OrbitControls(camera, container);
    controls.minDistance = 0;
    controls.maxDistance = 8;

    // 真上に光源を設定
    scene.add(new THREE.HemisphereLight(0x808080, 0x606060));

    // 特定の方向に向いた光を設定
    const light = new THREE.DirectionalLight(0xffffff);
    light.position.set(0, 6, 0);
    scene.add(light);

    // 入れ子構造を作成
    // 入れ子構造として設計することで、複数の3Dオブジェクトをまとめて移動させたり、回転させたりするのが便利になる
    group = new THREE.Group();
    scene.add(group);

    // 3Dモデルを画面に表示するためのレンダラー
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.xr.enabled = true;
    container.appendChild(renderer.domElement);

    document.body.appendChild(ARButton.createButton(renderer));
}

/** コントローラーを設定 */
const setControllers = () => {
    controller1 = renderer.xr.getController(0);
    controller1.addEventListener("selectstart", onSelectStart);
    controller1.addEventListener("selectend", onSelectEnd);
    scene.add(controller1);

    controller2 = renderer.xr.getController(1);
    controller2.addEventListener("selectstart", onSelectStart);
    controller2.addEventListener("selectend", onSelectEnd);
    scene.add(controller2);

    // コントローラーの向きにラインを表示
    const makeLine = (len) => {
        const material = new THREE.LineBasicMaterial({
        color: 0xffffff, // white
        });
        const points = [];
        points.push(new THREE.Vector3(0, 0, 0));
        points.push(new THREE.Vector3(0, 0, -len));
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geometry, material);
        return line;
    };
    controller1.add(makeLine(5));
    controller2.add(makeLine(5));
}


/** 初期化処理 */
const init = () => {
    // 空間を初期化
    initScene()

    // パーツを表示
    loadParts()

    // コントローラーを設定
    setControllers()

    // レイキャスティング
    // マウスピッキング（マウスが3D空間のどのオブジェクトの上にあるかを調べること）などに使わる。
    raycaster = new THREE.Raycaster();
};

init();
animate();

window.addEventListener("resize", onWindowResize);