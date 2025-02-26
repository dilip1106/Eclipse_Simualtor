import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";

// Add this function at the top of your component to handle screen size
const useWindowSize = () => {
  const [size, setSize] = useState({ width: window.innerWidth, height: window.innerHeight });

  useEffect(() => {
    const handleResize = () => {
      setSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return size;
};

const Lunar = () => {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const [earthAngle, setEarthAngle] = useState(0);
  const [moonAngle, setMoonAngle] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const animationFrameId = useRef(null);
  const [animationSpeed, setAnimationSpeed] = useState(0.5);
  const [eclipseMessage, setEclipseMessage] = useState('');
  const [autoResumeTimeout, setAutoResumeTimeout] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Add this inside your Lunar component at the top
  const { width } = useWindowSize();
  const isMobile = width <= 768;

  useEffect(() => {
    if (!sceneRef.current) {
      const scene = new THREE.Scene();
      sceneRef.current = scene;

      const camera = new THREE.OrthographicCamera(-30, 30, 30, -30, 1, 1000);
      camera.position.set(0, 0, 50);
      camera.lookAt(0, 0, 0);

      const renderer = new THREE.WebGLRenderer({ alpha: true });
      renderer.setSize(window.innerWidth - 40, window.innerHeight - 200);
      rendererRef.current = renderer;
      mountRef.current.appendChild(renderer.domElement);

      const textureLoader = new THREE.TextureLoader();

      // Sun Image
      const sunTexture = textureLoader.load("/sun.jpeg");
      const sunMaterial = new THREE.MeshBasicMaterial({ map: sunTexture, transparent: true });
      const sunGeometry = new THREE.PlaneGeometry(12, 12); // Increased size
      const sun = new THREE.Mesh(sunGeometry, sunMaterial);
      sun.position.set(0, 0, 0);
      scene.add(sun);

      // Earth Image
      const earthTexture = textureLoader.load("/earth.jpeg");
      const earthMaterial = new THREE.MeshBasicMaterial({ map: earthTexture, transparent: true });
      const earthGeometry = new THREE.PlaneGeometry(5, 5); // Increased size
      const earth = new THREE.Mesh(earthGeometry, earthMaterial);
      earth.name = "Earth";
      scene.add(earth);

      // Moon Image
      const moonTexture = textureLoader.load("/moon.jpeg");
      const moonMaterial = new THREE.MeshBasicMaterial({ map: moonTexture, transparent: true });
      const moonGeometry = new THREE.PlaneGeometry(2.5, 2.5); // Increased size
      const moon = new THREE.Mesh(moonGeometry, moonMaterial);
      moon.name = "Moon";
      scene.add(moon);

      // Add this inside the first useEffect, after adding the moon
      const createOrbitPath = (radius, segments = 64) => {
        const points = [];
        for (let i = 0; i <= segments; i++) {
          const theta = (i / segments) * Math.PI * 2;
          points.push(new THREE.Vector3(
            Math.cos(theta) * radius,
            Math.sin(theta) * radius,
            0
          ));
        }
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineDashedMaterial({
          color: 0x666666,
          dashSize: 1,
          gapSize: 1,
        });
        const orbit = new THREE.Line(geometry, material);
        orbit.computeLineDistances(); // Required for dashed lines
        return orbit;
      };

      // Add Earth's orbit path
      const earthOrbit = createOrbitPath(15); // Same radius as Earth's orbit
      scene.add(earthOrbit);

      // Add Moon's orbit path (this will need to be updated with Earth's position)
      const moonOrbit = createOrbitPath(5); // Same radius as Moon's orbit
      moonOrbit.name = "MoonOrbit";
      scene.add(moonOrbit);
    }

    // Handle Window Resize
    // Update in the first useEffect
    const handleResize = () => {
      if (rendererRef.current && mountRef.current) {
        const parent = mountRef.current.parentElement;
        const width = parent.clientWidth;
        const height = isMobile ? 400 : parent.clientHeight; // Fixed height for mobile
        
        // Update renderer size
        rendererRef.current.setSize(width, height);
        
        // Update camera frustum
        const camera = new THREE.OrthographicCamera(
          -30 * (width / height),
          30 * (width / height),
          30,
          -30,
          1,
          1000
        );
        camera.position.set(0, 0, 50);
        camera.lookAt(0, 0, 0);
        
        // Important: render the scene with new camera
        rendererRef.current.render(sceneRef.current, camera);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!sceneRef.current || !rendererRef.current) return;

    const scene = sceneRef.current;
    const earth = scene.getObjectByName("Earth");
    const moon = scene.getObjectByName("Moon");
    const renderer = rendererRef.current;
    const camera = new THREE.OrthographicCamera(-30, 30, 30, -30, 1, 1000);
    camera.position.set(0, 0, 50);
    camera.lookAt(0, 0, 0);

    // Update Earth Position
    const earthX = Math.cos(THREE.MathUtils.degToRad(earthAngle)) * 15;
    const earthY = Math.sin(THREE.MathUtils.degToRad(earthAngle)) * 15;
    earth.position.set(earthX, earthY, 0);

    // Update Moon Position (relative to Earth)
    const moonX = earthX + Math.cos(THREE.MathUtils.degToRad(moonAngle)) * 5;
    const moonY = earthY + Math.sin(THREE.MathUtils.degToRad(moonAngle)) * 5;
    moon.position.set(moonX, moonY, 0);

    // Check for eclipses
    const normalizedEarthAngle = earthAngle % 360;
    const normalizedMoonAngle = moonAngle % 360;

    // Lunar Eclipse Conditions
    const lunarConditions = [
      // Case 1: Earth 0°, Moon 0°
      (normalizedEarthAngle === 0 && normalizedMoonAngle === 0),
      // Case 2: Earth 0°, Moon 360°
      (normalizedEarthAngle === 0 && normalizedMoonAngle === 360),
      // Case 3: Earth 180°, Moon 180°
      (normalizedEarthAngle === 180 && normalizedMoonAngle === 180),
      // Case 4: Earth 360°, Moon 0°
      (normalizedEarthAngle === 360 && normalizedMoonAngle === 0),
      // Case 5: Earth 360°, Moon 360°
      (normalizedEarthAngle === 360 && normalizedMoonAngle === 360)
    ];

    // Solar Eclipse Conditions
    const solarConditions = [
      // Case 1: Earth 0°, Moon 180°
      (normalizedEarthAngle === 0 && normalizedMoonAngle === 180),
      // Case 2: Earth 180°, Moon 0°
      (normalizedEarthAngle === 180 && normalizedMoonAngle === 0),
      // Case 3: Earth 180°, Moon 360°
      (normalizedEarthAngle === 180 && normalizedMoonAngle === 360),
      // Case 4: Earth 360°, Moon 180°
      (normalizedEarthAngle === 360 && normalizedMoonAngle === 180)
    ];

    if (solarConditions.some(condition => condition)) {
      setEclipseMessage('🌑 Solar Eclipse Occurring!');
      // Pause animation and set up auto-resume
      setIsAnimating(false);
      if (autoResumeTimeout) clearTimeout(autoResumeTimeout);
      const timeout = setTimeout(() => {
        setIsAnimating(true);
        setEclipseMessage('');
      }, 3000); // Pause for 3 seconds
      setAutoResumeTimeout(timeout);
    } else if (lunarConditions.some(condition => condition)) {
      setEclipseMessage('🌕 Lunar Eclipse Occurring!');
      // Pause animation and set up auto-resume
      setIsAnimating(false);
      if (autoResumeTimeout) clearTimeout(autoResumeTimeout);
      const timeout = setTimeout(() => {
        setIsAnimating(true);
        setEclipseMessage('');
      }, 3000); // Pause for 3 seconds
      setAutoResumeTimeout(timeout);
    } else {
      setEclipseMessage('');
    }

    // Rest of your existing code...
    const moonOrbit = scene.getObjectByName("MoonOrbit");
    if (moonOrbit) {
      moonOrbit.position.set(earthX, earthY, 0);
    }
    renderer.render(scene, camera);
  }, [earthAngle, moonAngle]);

  useEffect(() => {
    if (isAnimating) {
      animate();
    } else {
      cancelAnimationFrame(animationFrameId.current);
    }

    return () => {
      cancelAnimationFrame(animationFrameId.current);
    };
  }, [isAnimating, animationSpeed]);

  useEffect(() => {
    return () => {
      if (autoResumeTimeout) {
        clearTimeout(autoResumeTimeout);
      }
    };
  }, [autoResumeTimeout]);

  const animate = () => {
    setEarthAngle(prev => (prev + (0.5 * animationSpeed)) % 360);
    setMoonAngle(prev => (prev + (1 * animationSpeed)) % 360);
    animationFrameId.current = requestAnimationFrame(animate);
  };

  const checkEclipse = () => {
    const normalizedEarthAngle = Math.round(earthAngle) % 360;
    const normalizedMoonAngle = Math.round(moonAngle) % 360;

    // Check for Solar Eclipse
    if ((normalizedEarthAngle === 0 && normalizedMoonAngle === 180) ||
      (normalizedEarthAngle === 180 && normalizedMoonAngle === 0) ||
      (normalizedEarthAngle === 180 && normalizedMoonAngle === 360) ||
      (normalizedEarthAngle === 360 && normalizedMoonAngle === 180)) {
      alert(`🌑 Solar Eclipse!\nEarth: ${normalizedEarthAngle}°\nMoon: ${normalizedMoonAngle}°`);
      return;
    }

    // Check for Lunar Eclipse
    if ((normalizedEarthAngle === 0 && normalizedMoonAngle === 0) ||
      (normalizedEarthAngle === 0 && normalizedMoonAngle === 360) ||
      (normalizedEarthAngle === 180 && normalizedMoonAngle === 180) ||
      (normalizedEarthAngle === 360 && normalizedMoonAngle === 0) ||
      (normalizedEarthAngle === 360 && normalizedMoonAngle === 360)) {
      alert(`🌕 Lunar Eclipse!\nEarth: ${normalizedEarthAngle}°\nMoon: ${normalizedMoonAngle}°`);
      return;
    }

    alert(`❌ No Eclipse\nEarth: ${normalizedEarthAngle}°\nMoon: ${normalizedMoonAngle}°`);
  };

  const handleReadAloud = () => {
    const text = "तमसा संवृतो भानुः, क्षणं चापि न दृश्यते नित्यं चक्रेण कालस्य, ग्रहणं सम्प्रवर्तते  Meaning The Sun is momentarily covered in darkness and becomes invisible, as the eternal cycle of time causes the eclipse to occur.";


    if ('speechSynthesis' in window) {
      if (isSpeaking) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
      } else {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "sa-IN"
        utterance.onend = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
        setIsSpeaking(true);
      }
    }
  };

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "100vh", // Changed from minHeight to fixed height
      width: "100vw",
      backgroundColor: "#fff",
      overflow: "hidden", // This prevents scrolling
      padding: isMobile ? "10px" : "20px",
      boxSizing: "border-box" // This ensures padding doesn't cause overflow
    }}>
      <h1 style={{
        color: "#333",
        textAlign: "center",
        margin: "0 0 10px 0", // Changed padding to margin
        fontSize: isMobile ? "20px" : "24px" // Added to ensure it doesn't take too much space
      }}>
        🌍 Lunar & Solar Eclipse Simulator
      </h1>

      <div style={{
        display: "flex",
        flex: 1,
        flexDirection: isMobile ? "column" : "row",
        gap: isMobile ? "10px" : "20px",
        overflow: "hidden" // Prevents scrolling in the content area
      }}>
        {/* Left Column - About and Controls */}
        <div style={{
          width: isMobile ? "100%" : "300px",
          display: "flex",
          flexDirection: "column",
          gap: isMobile ? "10px" : "20px"
        }}>
          {/* About Section */}
          <div style={{
            padding: "20px",
            backgroundColor: "#f5f5f5",
            borderRadius: "10px",
          }}>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "10px"
            }}>
              <h3 style={{ margin: 0, color: "#333" }}>About Eclipses</h3>
              <button
                onClick={handleReadAloud}
                style={{
                  padding: "8px 12px",
                  fontSize: "14px",
                  borderRadius: "5px",
                  border: "none",
                  backgroundColor: isSpeaking ? "#f44336" : "#2196F3",
                  color: "white",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px"
                }}
              >
                {isSpeaking ? "🔇 Stop" : "🔊 Read Aloud"}
              </button>
            </div>
            <p style={{
              margin: 0,
              color: "#666",
              fontSize: "14px",
              lineHeight: "1.5",
              fontWeight: "bold"
            }}>
              तमसा संवृतो भानुः, क्षणं चापि न दृश्यते।  <br />
              नित्यं चक्रेण कालस्य, ग्रहणं सम्प्रवर्तते
            </p>
            <p>
              Meaning:
              The Sun is momentarily covered in darkness and becomes invisible, as the eternal cycle of time causes the eclipse to occur.
            </p>
          </div>

          {/* Controls Section */}
          <div style={{
            padding: "20px",
            backgroundColor: "#f5f5f5",
            borderRadius: "10px",
            display: "flex",
            flexDirection: "column",
            gap: "20px"
          }}>
            <h2 style={{ margin: 0, color: "#333" }}>Controls</h2>

            {/* Earth Controls */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <label style={{ fontWeight: "bold", color: "#333" }}>
                Earth Orbit Angle: {Math.round(earthAngle)}°
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <button onClick={() => setEarthAngle((prev) => (prev - 10 + 360) % 360)}>◀</button>
                <input
                  type="range"
                  min="0"
                  max="360"
                  value={earthAngle}
                  onChange={(e) => setEarthAngle(parseFloat(e.target.value))}
                  style={{ flex: 1 }}
                />
                <button onClick={() => setEarthAngle((prev) => (prev + 10) % 360)}>▶</button>
              </div>
            </div>

            {/* Moon Controls */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <label style={{ fontWeight: "bold", color: "#333" }}>
                Moon Orbit Angle: {Math.round(moonAngle)}°
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <button onClick={() => setMoonAngle((prev) => (prev - 10 + 360) % 360)}>◀</button>
                <input
                  type="range"
                  min="0"
                  max="360"
                  value={moonAngle}
                  onChange={(e) => setMoonAngle(parseFloat(e.target.value))}
                  style={{ flex: 1 }}
                />
                <button onClick={() => setMoonAngle((prev) => (prev + 10) % 360)}>▶</button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <label style={{ fontWeight: "bold", color: "#333" }}>
                  Animation Speed: {animationSpeed.toFixed(1)}x
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <input
                    type="range"
                    min="0.1"
                    max="5"
                    step="0.1"
                    value={animationSpeed}
                    onChange={(e) => setAnimationSpeed(parseFloat(e.target.value))}
                    style={{ flex: 1 }}
                  />
                </div>
              </div>
              <button
                onClick={() => setIsAnimating(prev => !prev)}
                style={{
                  padding: "10px",
                  fontSize: "16px",
                  borderRadius: "5px",
                  border: "none",
                  backgroundColor: isAnimating ? "#f44336" : "#4CAF50",
                  color: "white",
                  cursor: "pointer",
                  marginTop: "auto"
                }}
              >
                {isAnimating ? "⏸️ Pause Animation" : "▶️ Start Animation"}
              </button>
              <button
                onClick={checkEclipse}
                style={{
                  padding: "10px",
                  fontSize: "16px",
                  borderRadius: "5px",
                  border: "none",
                  backgroundColor: "#4CAF50",
                  color: "white",
                  cursor: "pointer",
                  marginTop: "auto"
                }}
              >
                🔍 Check Eclipse
              </button>
            </div>


          </div>
        </div>

        {/* Right Column - Simulation */}
        <div style={{
          flex: 1,
          backgroundColor: "#000",
          borderRadius: "10px",
          minHeight: isMobile ? "400px" : "calc(100vh - 140px)", // Changed height to minHeight
          maxHeight: isMobile ? "50vh" : "calc(100vh - 140px)", // Added maxHeight
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          overflow: "hidden",
          position: "relative"
        }}>
          {eclipseMessage && (
            <div style={{
              position: 'absolute',
              // transform: 'translateX(-50%)',
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              color: 'white',
              padding: '10px 20px',
              borderRadius: '5px',
              fontSize: '20px',
              zIndex: 1000,
              animation: 'fadeIn 0.5s ease-in-out'
            }}>
              {eclipseMessage}
            </div>
          )}
          <div ref={mountRef} style={{
            width: "100%",
            height: "100%",
            display: "flex",
            justifyContent: "center",
            alignItems: "center"
          }} />
        </div>
      </div>
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
        `}
      </style>
    </div>
  );
};

export default Lunar;
