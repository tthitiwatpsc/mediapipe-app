import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

// เปลี่ยนข้อความบนหน้าเว็บ
document.querySelector('#app').innerHTML = `
  <div>
    <h1>MediaPipe Face Landmarker</h1>
    <h2 id="status" style="color: orange;">กำลังโหลดโมเดล...</h2>
  </div>
`;

const statusText = document.getElementById("status");

async function startApp() {
  try {
    // 1. โหลด WASM binaries
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
    );

    // 2. โหลดโมเดลจาก local path
    const faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: "/models/face_landmarker.task"
      },
      runningMode: "IMAGE"
    });

    statusText.innerText = "โมเดลโหลดสำเร็จพร้อมใช้งาน!";
    statusText.style.color = "green";
    console.log("FaceLandmarker Ready:", faceLandmarker);
  } catch (error) {
    statusText.innerText = "เกิดข้อผิดพลาดในการโหลดโมเดล";
    statusText.style.color = "red";
    console.error(error);
  }
}

startApp();