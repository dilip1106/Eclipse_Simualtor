import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";

const Lunar = () => {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const [earthAngle, setEarthAngle] = useState(0);
  const [moonAngle, setMoonAngle] = useState(0);
  const [isAnimating, setIsAnimating] = useState(true);
  const animationFrameId = useRef(null);
  const [animationSpeed, setAnimationSpeed] = useState(0.5);

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
        rendererRef.current.setSize(
          parent.clientWidth,
          parent.clientHeight
        );
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


    // Inside the second useEffect, after setting moon position


    // Update Earth Position
    const earthX = Math.cos(THREE.MathUtils.degToRad(earthAngle)) * 15;
    const earthY = Math.sin(THREE.MathUtils.degToRad(earthAngle)) * 15;
    earth.position.set(earthX, earthY, 0);

    // Update Moon Position (relative to Earth)
    const moonX = earthX + Math.cos(THREE.MathUtils.degToRad(moonAngle)) * 5;
    const moonY = earthY + Math.sin(THREE.MathUtils.degToRad(moonAngle)) * 5;
    moon.position.set(moonX, moonY, 0);

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

  const animate = () => {
    setEarthAngle(prev => (prev + (0.5 * animationSpeed)) % 360);
    setMoonAngle(prev => (prev + (1 * animationSpeed)) % 360);
    animationFrameId.current = requestAnimationFrame(animate);
  };

  const checkEclipse = () => {
    const solarEclipseCondition1 = Math.abs(earthAngle) < 10 && Math.abs(moonAngle - 180) < 10;
    const solarEclipseCondition2 = Math.abs(earthAngle - 180) < 10 && Math.abs(moonAngle) < 10;

    if (solarEclipseCondition1 || solarEclipseCondition2) {
      alert(`🌑 Solar Eclipse Detected!\nEarth Angle: ${earthAngle}°\nMoon Angle: ${moonAngle}°`);
      return;
    }

    const angleDiff = Math.abs(moonAngle - earthAngle);
    const isOpposite = Math.abs(angleDiff - 180) < 10;
    const isSame = angleDiff < 10;

    if (isOpposite || isSame) {
      alert(`🌕 Lunar Eclipse Detected!\nEarth Angle: ${earthAngle}°\nMoon Angle: ${moonAngle}°`);
      return;
    }

    alert(`❌ No Eclipse Detected\nEarth Angle: ${earthAngle}°\nMoon Angle: ${moonAngle}°`);
  };

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "100vh", // Changed from minHeight to fixed height
      width: "95vw",
      backgroundColor: "#fff",
      overflow: "hidden", // This prevents scrolling
      padding: "20px",
      boxSizing: "border-box" // This ensures padding doesn't cause overflow
    }}>
      <h1 style={{
        color: "#333",
        textAlign: "center",
        margin: "0 0 20px 0", // Changed padding to margin
        fontSize: "24px" // Added to ensure it doesn't take too much space
      }}>
        🌍 Lunar & Solar Eclipse Simulator
      </h1>

      <div style={{
        display: "flex",
        flex: 1,
        gap: "20px",
        overflow: "hidden" // Prevents scrolling in the content area
      }}>
        {/* Left Column - Controls */}
        <div style={{
          width: "300px",
          padding: "20px",
          backgroundColor: "#f5f5f5",
          borderRadius: "10px",
          display: "flex",
          flexDirection: "column",
          gap: "20px",
          maxHeight: "max-content",
        }}>
          <h2 style={{ margin: 0, color: "#333" }}>Controls</h2>

          {/* Earth Controls */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <label style={{ fontWeight: "bold", color: "#333" }}>
              Earth Orbit Angle: {earthAngle}°
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
              Moon Orbit Angle: {moonAngle}°
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

        {/* Right Column - Simulation */}
        <div style={{
          flex: 1,
          backgroundColor: "#000",
          borderRadius: "10px",
          height: "calc(100vh - 140px)",
          display: "flex",  // Add this
          justifyContent: "center",  // Add this
          alignItems: "center",  // Add this
          overflow: "hidden"
        }}>
          <div ref={mountRef} style={{
            width: "100%",
            height: "100%",
            display: "flex",  // Add this
            justifyContent: "center",  // Add this
            alignItems: "center"  // Add this
          }} />
        </div>
      </div>
    </div>
  );
};

export default Lunar;
