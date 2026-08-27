import { FaceLandmarker, FilesetResolver, DrawingUtils } from "@mediapipe/tasks-vision";

const video = document.getElementById("webcam");
const canvasElement = document.getElementById("output_canvas");
const canvasCtx = canvasElement.getContext("2d");
const statusText = document.getElementById("status");

let faceLandmarker;
let drawingUtils;
let lastVideoTime = -1;

async function init() {
  try {
    statusText.innerText = "กำลังโหลด WASM และโมเดล...";
    
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
    );

    faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: "/models/face_landmarker.task",
        delegate: "GPU"
      },
      runningMode: "VIDEO",
      numFaces: 1
    });

    drawingUtils = new DrawingUtils(canvasCtx);
    statusText.innerText = "กำลังเปิดกล้องเว็บแคม...";
    
    startWebcam();
  } catch (error) {
    statusText.innerText = "เกิดข้อผิดพลาดในการโหลดโมเดล";
    statusText.style.color = "red";
    console.error(error);
  }
}

async function startWebcam() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480 }
    });
    
    video.srcObject = stream;
    video.addEventListener("loadeddata", () => {
      statusText.innerText = "กำลังทำงาน (Real-Time)";
      statusText.style.color = "lightgreen";
      canvasElement.width = video.videoWidth;
      canvasElement.height = video.videoHeight;
      predictWebcam();
    });
  } catch (err) {
    statusText.innerText = "กรุณากดอนุญาตสิทธิ์การใช้งานกล้องในเบราว์เซอร์";
    statusText.style.color = "orange";
    console.error(err);
  }
}

async function predictWebcam() {
  if (lastVideoTime !== video.currentTime) {
    lastVideoTime = video.currentTime;

    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    const startTimeMs = performance.now();
    const results = faceLandmarker.detectForVideo(video, startTimeMs);

    if (results.faceLandmarks) {
      for (const landmarks of results.faceLandmarks) {
        drawingUtils.drawConnectors(
          landmarks,
          FaceLandmarker.FACE_LANDMARKS_CONTOURS,
          { color: "#C0C0C070", lineWidth: 1 }
        );
        drawingUtils.drawConnectors(
          landmarks,
          FaceLandmarker.FACE_LANDMARKS_TESSELATION,
          { color: "#C0C0C020", lineWidth: 1 }
        );
        drawingUtils.drawConnectors(
          landmarks,
          FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE,
          { color: "#FF3030", lineWidth: 2 }
        );
        drawingUtils.drawConnectors(
          landmarks,
          FaceLandmarker.FACE_LANDMARKS_LEFT_EYE,
          { color: "#30FF30", lineWidth: 2 }
        );
        drawingUtils.drawConnectors(
          landmarks,
          FaceLandmarker.FACE_LANDMARKS_LIPS,
          { color: "#E0E0E0", lineWidth: 2 }
        );
      }
    }
  }
  requestAnimationFrame(predictWebcam);
}

init();
