interface ConditionalRule {
  rule: string;
  params?: Record<string, any>;
}


interface BaseNode {
  id: string;
  position: { x: number; y: number };
  emoji: string;
  color: string;
  design: string; //for UI
  functionality: string; //for Runware API and Connection Rules
  type:string, //for right sidebar content
  data: {
    name: string;
    order: number;
    width: number;
    height: number;
  };
  right_sidebar:{},
  rules: {
    from: string[];
    to: string[];
    conditional_rules?: ConditionalRule[];
  };
}



//Control Nets

interface PoseControl extends BaseNode {
  design: 'normal-node',
  functionality: 'control-net',
  type:'control-net-pose',
  right_sidebar: {
    pose: string | object;
    source: string;
    fingers: { left: number; right: number };
    shoulders: { left: number; right: number };
    elbow: { left: number; right: number };
    hip: { left: number; right: number };
    knee: { left: number; right: number };
    ankle: { left: number; right: number };
    neck: number;
    head: number;
  };
   rules: {
    from: ["layer-image", "preview-image", "preview-realtime"];
    to: ["preview-image"];
  };
}

interface EdgeControl extends BaseNode {
  design: 'normal-node',
  functionality: 'control-net',
  type:'control-net-edge',
  right_sidebar: {
    image: string,
    type: 'source' | 'final map',
    source: string,
    map: string
  };
  rules: {
    from: ["layer-image", "preview-image", "preview-realtime"];
    to: ["preview-image"];
  };
}

interface LightsControl extends BaseNode {
  design: 'normal-node',
  functionality: 'control-net',
  type:'control-net-lights',
  right_sidebar: {
    blend: string,
    image: string,
    power: number,
    color: string,
    length: number,
    width: number,
    location: {x:number, y:number}
  };
  rules: {
    from: ["layer-image", "preview-image", "preview-realtime"];
    to: ["preview-image"];
  };
}

interface FaceExpression extends BaseNode {
  design: 'normal-node',
  functionality: 'control-net',
  type:'control-net-face',
  right_sidebar: {
    image:string,
    template: string,
    source: ImageOutput,
    shoulders: { left: number; right: number };
    elbow: { left: number; right: number };
    hip: { left: number; right: number };
    knee: { left: number; right: number };
    ankle: { left: number; right: number };
    neck: number;
    head: number;
  },
  rules: {
    from: ["layer-image", "preview-image", "preview-realtime"];
    to: ["preview-image"];
  };
}

interface Segments extends BaseNode {
  design: 'normal-node',
  functionality: 'control-net',
  type:'control-net-segments',
  right_sidebar: {
    image: string,
    type: 'source' | 'final map',
    source: string,
    map: string
  },
  rules: {
    from: ["layer-image", "preview-image", "preview-realtime"];
    to: ["preview-image"];
  };
}

interface DepthControl extends BaseNode {
  design: 'normal-node',
  functionality: 'control-net',
  type:'control-net-depth',
  right_sidebar: {
    image: string,
    type: 'source' | 'final map',
    source: string,
    map: string
  },
  rules: {
    from: ["layer-image", "preview-image", "preview-realtime"];
    to: ["preview-image"];
  };
}

interface NormalMap extends BaseNode {
  design: 'normal-node',
  functionality: 'control-net',
  type:'control-net-normal-map',
  right_sidebar: {
    image: string,
    type: 'source' | 'final map',
    source: string,
    map: string
  },
  rules: {
    from: ["layer-image", "preview-image", "preview-realtime"];
    to: ["preview-image"];
  };
}

interface Reference extends BaseNode {
  design: 'normal-node',
  functionality: 'control-net',
  type:'control-net-reference',
  right_sidebar: {
    type: 'source' | 'final map',
    power: number,
  },
  rules: {
    from: ["layer-image", "preview-image", "preview-realtime"];
    to: ["preview-image"];
  };
}

//Re-rendering (image-to-image)

interface ReImagine extends BaseNode {
  design: 'normal-node',
  functionality: 'image-to-image',
  type:'image-to-image-re-imagine',
  right_sidebar: {
    creativity: number;
  },
  rules: {
    from: ["layer-image", "preview-image", "preview-realtime"];
    to: ["preview-image"];
  };
}

interface ReScene extends BaseNode {
  design: 'normal-node',
  functionality: 'image-to-image',
  type:'image-to-image-re-scene',
  right_sidebar: {
    scene: object,
    object: object,
    creativity: number;
  },
  rules: {
    from: ["layer-image", "preview-image", "preview-realtime"];
    to: ["preview-image"];
  };
}

//right sidebar missing
interface ObjectReLight extends BaseNode {
  design: 'normal-node',
  functionality: 'image-to-image',
  type:'image-to-image-object-relight',
  right_sidebar: {
    scene: object,
    object: object,
    creativity: number;
  },
  rules: {
    from: ["layer-image", "preview-image", "preview-realtime"];
    to: ["preview-image"];
  };
}


interface ReAngle extends BaseNode {
  design: 'normal-node',
  functionality: 'image-to-image',
  type:'image-to-image-reangle',
  right_sidebar: {
    angle: {x:number, y:number, z:number}
  },
  rules: {
    from: ["layer-image", "preview-image", "preview-realtime"];
    to: ["preview-image"];
  };
}


//Tools (image-to-image) & (text-input) & (input-nodes)

interface RemoveBG extends BaseNode {
  design: 'normal-node',
  functionality: 'image-to-image',
  type:'image-to-image-remove-bg',
  right_sidebar: {
    softness: number;
    thresholds: number;
    style: string;
    compare: boolean;
    deliver: 'Image' | 'Mask';
  },
  rules: {
    from: ["layer-image", "preview-image", "preview-realtime"];
    to: ["preview-image"];
  };
}


interface Upscale extends BaseNode {
  design: 'normal-node',
  functionality: 'image-to-image',
  type:'image-to-image-upscale',
  right_sidebar: {
    ratio: '2x' | '4x' | '8x' | '16x';
    creativity: number;
    style: string;
    compare: boolean;
  },
  rules: {
    from: ["layer-image", "preview-image", "preview-realtime"];
    to: ["preview-image"];
  };
}


interface Inpainting extends BaseNode {
  design: 'normal-node',
  functionality: 'image-to-image',
  type:'image-to-image-inpainting',
  right_sidebar: {
    source: string;
    prompt: string;
  },
  rules: {
    from: ["layer-image", "preview-image", "preview-realtime"];
    to: ["preview-image"];
  };
}


interface ThreeDMaker extends BaseNode {
  design: 'normal-node',
  functionality: 'image-to-image',
  type:'image-to-image-3d-maker',
  right_sidebar: {
    meshRes: number;
    textureRes: number;
    compare: boolean;
    deliver: 'Textured' | 'Mesh';
  },
  rules: {
    from: ["layer-image", "preview-image", "preview-realtime"];
    to: ["preview-image"];
  };
}


interface TextPrompt extends BaseNode {
  design: 'normal-node',
  functionality: 'input',
  type:'input-text',
  right_sidebar: {
    prompt: string;
    negative: string;
    enhance: boolean;
  },
    rules: {
    from: [];
    to: ["engine"];
  };
}


interface Merger extends BaseNode {
  design: 'normal-node',
  functionality: 'image-to-image',
  type:'image-to-image-merger',
  right_sidebar: {
    images: [{ src: string; weight: number }]
  };
}

interface Router extends BaseNode {
  design: 'custom-router',
  functionality: 'helper',
  type:'connector',
  right_sidebar: {};
}


//Render (preview)
interface ImageOutput extends BaseNode {
  design: 'layer-image-node',
  functionality: 'preview',
  type:"preview-image",
  right_sidebar: {
    preview: string;
    quality: number;
    ratio: 'Outpaint' | 'Inpaint';
    accident: number;
  },
  rules: {
    from: ["control-net-pose",
          "control-net-face",
          "control-net-edge",
          "control-net-depth",
          "control-net-segment",
          "control-net-normal-map",
          "control-net-reference",
          "image-to-image-re-imagine",
          "image-to-image-re-scene",
          "image-to-image-object-relight",
          "image-to-image-reangle",
          "image-to-image-remove-bg",
          "image-to-image-remove-upscale",
          "image-to-image-remove-inpainting",
          "image-to-image-remove-3d-maker",
          "image-to-image-remove-outpainting",
          "text-input",
          "image-to-image-remove-merger",
          "connector",
    ];
    to: [""]
  };

}

interface Realtime extends BaseNode {
  design: 'image-node',
  functionality: 'preview',
  type:"preview-realtime"
  right_sidebar: {
    preview: string;
    quality: number;
    ratio: 'Outpaint' | 'Inpaint';
    accident: number;
  },
    rules: {
    from: ["control-net-pose",
          "control-net-face",
          "control-net-edge",
          "control-net-depth",
          "control-net-segment",
          "control-net-normal-map",
          "control-net-reference",
          "image-to-image-re-imagine",
          "image-to-image-re-scene",
          "image-to-image-object-relight",
          "image-to-image-reangle",
          "image-to-image-remove-bg",
          "image-to-image-remove-upscale",
          "image-to-image-remove-inpainting",
          "image-to-image-remove-3d-maker",
          "image-to-image-remove-outpainting",
          "text-input",
          "image-to-image-remove-merger",
          "connector",
    ];
    to: [""]
  };
}

//Engines (Model+Lora)
interface Engine extends BaseNode {
  design: 'normal-node',
  functionality: 'engine',
  type: "engine-real"|"engine-draw"|"engine-dream"|"engine-style"|"engine-ads"|"engine-home",
  model: string,
  lora: string,
  image_url:string
  right_sidebar: {
    accident: number,
    quality: number,
    ratio: string,
    size: {width:number, height:number}
  },
    rules: {
    from: [
          "control-net-pose",
          "control-net-face",
          "control-net-edge",
          "control-net-depth",
          "control-net-segment",
          "control-net-normal-map",
          "control-net-reference",
          "image-to-image-re-imagine",
          "image-to-image-re-scene",
          "image-to-image-object-relight",
          "image-to-image-reangle",
          "image-to-image-remove-bg",
          "image-to-image-remove-upscale",
          "image-to-image-remove-inpainting",
          "image-to-image-remove-3d-maker",
          "image-to-image-remove-outpainting",
          "text-input",
          "image-to-image-remove-merger",
          "connector",
          "layer-image",
          "preview-image"
    ];

    to: ["preview-image", "realtime-image"],
    conditional_rules: [
      {
        rule: "require-incoming-if-outgoing"
      },
      {
        rule: "disallow-input-if-from-node-is",
        params: { disallowedType: ["image-to-image-re-imagine", "image-to-image-inpainting"] }
      }
    ]
  };
}

//Gears (Loras)
interface Gear extends BaseNode {
  design: 'normal-node';
  functionality: 'lora';
  type:string,
  lora: string,
  image_url:string,
  right_sidebar: {
    power: number;
    tags: string[];
  };
}

//Layers (Input Nodes)
interface ImageLayer extends BaseNode {
  design: 'layer-image-node',
  functionality: 'layer',
  type: 'layer-image',
}

interface Shape extends BaseNode {
  design: 'shape-node',
  functionality: 'layer',
  type: 'layer-triangle' | 'layer-circle' | 'layer-square' | 'layer-frame' | 'layer-section'
}

interface Comment extends BaseNode {
  design: 'comment-node',
  functionality: 'layer',
  type:"layer-comment"
}



type Node =
  | PoseControl
  | EdgeControl
  | LightsControl
  | FaceExpression
  | Segments
  | DepthControl
  | NormalMap
  | Reference
  | ReImagine
  | ReScene
  | ObjectReLight
  | ReAngle
  | RemoveBG
  | Upscale
  | Inpainting
  | ThreeDMaker
  | TextPrompt
  | Merger
  | Router
  | ImageOutput
  | Realtime
  | Engine
  | Gear
  | ImageLayer
  | Shape 
  | Comment;
