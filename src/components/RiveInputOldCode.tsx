// import React, { useState, useEffect, useRef } from "react";
// import Rive, {useRive, useRiveFile, UseRiveParameters} from "@rive-app/webgl2";


// //"https://unpkg.com/@rive-app/canvas@"
// //"https://unpkg.com/@rive-app/canvas@2.24.0"
// //"https://unpkg.com/@rive-app/webgl2"
// //"https://unpkg.com/@rive-app/webgl2-advanced"
// //"https://unpkg.com/@rive-app/webgl2-advanced@2.20.0"
// //`https://unpkg.com/@rive-app/canvas-advanced@1.0.91/rive.wasm`

// export const RiveInput: React.FC<{ nodeType: string }> = ({ nodeType }) => {

//     // const [riveFile, setRiveFile] = useState<string | null>(null);
//     // const [isPlaying, setIsPlaying] = useState(true);
//     // const [riveInstance, setRiveInstance] = useState<any>(null);
//     // const [isRiveLoaded, setIsRiveLoaded] = useState(false);
//     // const canvasRef = useRef<HTMLCanvasElement>(null);
//     // const fileInputRef = useRef<HTMLInputElement>(null);
//     const artboard = nodeType === "lights" ? "Artboard": "final for nover"

//     // useEffect(() => {
//     //     const script = document.createElement('script');
//     //     script.src = "https://unpkg.com/@rive-app/webgl2";
//     //     script.onload = () => {
//     //         setIsRiveLoaded(true);
//     //     };
//     //     document.head.appendChild(script);

//     //     return () => {
//     //     document.head.removeChild(script);
//     //     };
//     // }, []);

//     // useEffect(() => {
//     //     if (!isRiveLoaded || !canvasRef.current) return;

//     //     const canvas = canvasRef.current;

//     //     // Clean up previous instance
//     //     if (riveInstance) {
//     //     riveInstance.cleanup();
//     //     }

//     //     // Create new Rive instance
//     //     const rive = new window.rive.Rive({
//     //         src: rivePath,
//     //         canvas: canvas,
//     //         autoplay: true,
//     //         artboard: artboard,
//     //         stateMachines:"State Machine 1",
//     //         onLoad: () => {
//     //             console.log('Rive animation loaded');
//     //                 rive.resizeDrawingSurfaceToCanvas();
//     //         },
//     //         onLoadError: (error: any) => {
//     //             console.error('Failed to load Rive animation:', error);
//     //             toast.error('Failed to load Rive animation');
//     //         }
//     //     });

//     //     setRiveInstance(rive);

//     //     return () => {
//     //     if (rive) {
//     //         rive.cleanup();
//     //     }
//     //     };
//     // }, [isRiveLoaded, riveFile]);

//     const rivePath = nodeType.includes("pose")
//     ? "/rive/pose.riv"
//     : nodeType.includes("lights")
//     ? "/rive/lights.riv"
//     : null;

//     const labelName = nodeType.includes("pose")
//     ? "Pose"
//     : nodeType.includes("lights")
//     ? "Light Controller"
//     : "";


//     const riveParams: UseRiveParameters = {
//         src: rivePath,
//         autoplay: true,
//         stateMachines: "State Machine 1",
//         artboard: artboard,
//         useOffscreenRenderer: false
//     };

//     if (!rivePath) return null;
    
//     const { rive, RiveComponent } = useRive(riveParams);

    
//     return (
//         <div className="mb-4">
//         <label className="block text-sm font-medium text-gray-300 mb-1">
//             {labelName}
//         </label>
//         <div className="w-[235px] h-[235px] aspect-video border-2 border-[#1e1e1e] overflow-hidden rounded-2xl cursor-pointer">
//             {/* <canvas 
//                 ref={canvasRef}
//                 height={240}
//                 width={240}
//                 style={{ display: 'block' }}
//             /> */}
//             <RiveComponent className="w-full h-full"/>
//         </div>
//         </div>
//     );
//     };

//     export default RiveInput
