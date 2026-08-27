import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

const statusText = document.getElementById("status");

async function startApp() {
  try {
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
    );

    const faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: "/models/face_landmarker.task"
      },
      runningMode: "IMAGE"
    });

    statusText.innerText = "โมเดลโหลดสำเร็จพร้อมใช้งาน!";
    console.log("FaceLandmarker Ready:", faceLandmarker);
  } catch (error) {
    statusText.innerText = "เกิดข้อผิดพลาดในการโหลดโมเดล";
    console.error(error);
  }
}

startApp();