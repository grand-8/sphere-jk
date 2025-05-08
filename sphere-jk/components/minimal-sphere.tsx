"use client"

import { useRef, useEffect } from "react"
import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"

export default function MinimalSphere() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    // Créer la scène
    const scene = new THREE.Scene()

    // Créer la caméra
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000)
    camera.position.z = 15

    // Créer le renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setClearColor(0x000000)
    containerRef.current.appendChild(renderer.domElement)

    // Ajouter les lumières
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
    scene.add(ambientLight)

    const pointLight = new THREE.PointLight(0xffffff, 1)
    pointLight.position.set(10, 10, 10)
    scene.add(pointLight)

    // Créer la sphère
    const sphereGeometry = new THREE.SphereGeometry(5, 64, 64)

    // Créer un matériau avec un dégradé de couleurs
    const sphereColors = new Float32Array(sphereGeometry.attributes.position.count * 3)

    for (let i = 0; i < sphereGeometry.attributes.position.count; i++) {
      const y = sphereGeometry.attributes.position.getY(i)
      const normalizedY = (y + 5) / 10 // Normaliser entre 0 et 1

      let r, g, b

      if (normalizedY < 0.33) {
        // Bleu à violet
        r = 0.2 + normalizedY * 3 * 0.4
        g = 0.2 + normalizedY * 3 * 0.1
        b = 0.8 - normalizedY * 3 * 0.2
      } else if (normalizedY < 0.66) {
        // Violet à rose
        r = 0.6 + (normalizedY - 0.33) * 3 * 0.3
        g = 0.3 - (normalizedY - 0.33) * 3 * 0.1
        b = 0.6 - (normalizedY - 0.33) * 3 * 0.2
      } else {
        // Rose à orange
        r = 0.9
        g = 0.2 + (normalizedY - 0.66) * 3 * 0.4
        b = 0.4 - (normalizedY - 0.66) * 3 * 0.3
      }

      sphereColors[i * 3] = r
      sphereColors[i * 3 + 1] = g
      sphereColors[i * 3 + 2] = b
    }

    sphereGeometry.setAttribute("color", new THREE.BufferAttribute(sphereColors, 3))

    const sphereMaterial = new THREE.MeshStandardMaterial({
      vertexColors: true,
    })

    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial)
    scene.add(sphere)

    // Ajouter les contrôles OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enablePan = false
    controls.minDistance = 8
    controls.maxDistance = 20
    controls.enableDamping = true
    controls.dampingFactor = 0.05

    // Fonction d'animation
    const animate = () => {
      requestAnimationFrame(animate)

      // Rotation de la sphère
      sphere.rotation.y += 0.002

      controls.update()
      renderer.render(scene, camera)
    }

    animate()

    // Gestionnaire de redimensionnement
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }

    window.addEventListener("resize", handleResize)

    // Nettoyage
    return () => {
      window.removeEventListener("resize", handleResize)

      if (containerRef.current) {
        containerRef.current.removeChild(renderer.domElement)
      }

      // Libérer les ressources
      sphereGeometry.dispose()
      sphereMaterial.dispose()
      renderer.dispose()
      controls.dispose()
    }
  }, []) // Exécuté une seule fois à l'initialisation

  return <div ref={containerRef} className="w-full h-screen" />
}
