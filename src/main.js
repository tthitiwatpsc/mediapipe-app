import { FaceLandmarker, FilesetResolver, DrawingUtils } from "@mediapipe/tasks-vision";

const video = document.getElementById("webcam");
const canvasElement = document.getElementById("output_canvas");
const canvasCtx = canvasElement.getContext("2d");
const statusText = document.getElementById("status");

// ดึง Elements สำหรับปุ่มกดบันทึก
const captureBtn = document.getElementById("captureBtn");
const dbStatus = document.getElementById("dbStatus");

let faceLandmarker;
let drawingUtils;
let lastVideoTime = -1;
let latestLandmarks = null; // ตัวแปรสำหรับเก็บพิกัดเฟรมล่าสุด

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
    statusText.innerText = "กรุณากดอนุญาตสิทธิ์การใช้งานกล้อง";
    statusText.style.color = "orange";
  }
}

async function predictWebcam() {
  if (lastVideoTime !== video.currentTime) {
    lastVideoTime = video.currentTime;

    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    const startTimeMs = performance.now();
    const results = faceLandmarker.detectForVideo(video, startTimeMs);

    if (results.faceLandmarks && results.faceLandmarks.length > 0) {
      // อัปเดตพิกัดใบหน้าล่าสุดเข้าตัวแปร
      latestLandmarks = results.faceLandmarks[0];

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
      }
    } else {
      latestLandmarks = null; // ถ้าไม่พบใบหน้า ให้ล้างค่าออก
    }
  }
  requestAnimationFrame(predictWebcam);
}

// -------------------------------------------------------------------
// ส่วนการดึงข้อมูล Embedding และส่งเข้า Database เมื่อกดปุ่ม
// -------------------------------------------------------------------
captureBtn.addEventListener("click", async () => {
  if (!latestLandmarks) {
    dbStatus.innerText = "❌ ไม่พบใบหน้าในขณะนี้ กรุณาหันหน้าเข้าหากล้อง";
    dbStatus.style.color = "red";
    return;
  }

  dbStatus.innerText = "⏳ กำลังแปลงข้อมูลและบันทึกลงฐานข้อมูล...";
  dbStatus.style.color = "yellow";

  // 1. แปลงพิกัด 478 จุด (x, y, z) เป็น Vector Array 1434 มิติ
  const embeddingVector = latestLandmarks.flatMap(point => [point.x, point.y, point.z]);

  // 2. โครงสร้างข้อมูลที่จะส่งไปเก็บ
  const payload = {
    userId: "user_" + Date.now(), // สมมติ ID ผู้ใช้
    createdAt: new Date().toISOString(),
    vectorSize: embeddingVector.length, // ความยาว 1434 ค่า
    embedding: embeddingVector
  };

  try {
    // 3. ยิง API ส่งข้อมูลไปเก็บใน Database ของคุณ
    /* 
    const response = await fetch("https://your-api-endpoint.com/api/save-embedding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    */

    // พิมพ์ทดสอบดูโครงสร้าง Vector ใน Console
    console.log("บันทึก Vector สำเร็จ:", payload);

    dbStatus.innerText = `✅ บันทึกสำเร็จ! (Vector Size: ${embeddingVector.length} มิติ)`;
    dbStatus.style.color = "lightgreen";
  } catch (error) {
    dbStatus.innerText = "❌ เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล";
    dbStatus.style.color = "red";
    console.error(error);
  }
});

init();
