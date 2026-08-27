import { FaceLandmarker, FilesetResolver, DrawingUtils } from "@mediapipe/tasks-vision";
import { createClient } from "@supabase/supabase-js";

// -------------------------------------------------------------------
// 1. ตั้งค่า Supabase Connection (ใส่ค่าของคุณเองที่นี่)
// -------------------------------------------------------------------
const SUPABASE_URL = "https://xxxx.supabase.co"; 
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// -------------------------------------------------------------------
// 2. Setup DOM Elements & MediaPipe
// -------------------------------------------------------------------
const video = document.getElementById("webcam");
const canvasElement = document.getElementById("output_canvas");
const canvasCtx = canvasElement.getContext("2d");
const statusText = document.getElementById("status");
const captureBtn = document.getElementById("captureBtn");
const dbStatus = document.getElementById("dbStatus");

let faceLandmarker;
let drawingUtils;
let lastVideoTime = -1;
let latestLandmarks = null;

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
      statusText.innerText = "ระบบพร้อมทำงาน";
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
      latestLandmarks = results.faceLandmarks[0];

      for (const landmarks of results.faceLandmarks) {
        drawingUtils.drawConnectors(
          landmarks,
          FaceLandmarker.FACE_LANDMARKS_CONTOURS,
          { color: "#C0C0C070", lineWidth: 1 }
        );
      }
    } else {
      latestLandmarks = null;
    }
  }
  requestAnimationFrame(predictWebcam);
}

// -------------------------------------------------------------------
// 3. กดปุ่มเพื่อบันทึก Vector (1434 Dimensions) ลง Supabase
// -------------------------------------------------------------------
captureBtn.addEventListener("click", async () => {
  if (!latestLandmarks) {
    dbStatus.innerText = "❌ ไม่พบใบหน้า กรุณาหันหน้าเข้าหากล้อง";
    dbStatus.style.color = "red";
    return;
  }

  dbStatus.innerText = "⏳ กำลังบันทึกลง Supabase...";
  dbStatus.style.color = "yellow";

  // แปลงพิกัด 478 จุด (x, y, z) เป็น Array 1434 ค่า
  const embeddingVector = latestLandmarks.flatMap(p => [p.x, p.y, p.z]);

  try {
    const { data, error } = await supabase
      .from("face_embeddings")
      .insert([
        {
          user_name: "User_" + Math.floor(Math.random() * 1000),
          embedding: embeddingVector
        }
      ]);

    if (error) throw error;

    dbStatus.innerText = `✅ บันทึกลง Supabase สำเร็จ! (${embeddingVector.length} มิติ)`;
    dbStatus.style.color = "lightgreen";
  } catch (error) {
    dbStatus.innerText = "❌ เกิดข้อผิดพลาด: " + error.message;
    dbStatus.style.color = "red";
    console.error("Supabase Insert Error:", error);
  }
});

init();
