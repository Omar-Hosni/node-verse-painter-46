import {
// Basic UI Icons Cpu, Layers, Image as ImageIcon, Type, FileOutput, HelpCircle,
  ChevronDown, ChevronRight, LayoutList, SquarePlus, FileImage, Shuffle,
  Search, PlusCircle, Paintbrush, Text, Frame, Triangle, RectangleHorizontal, Circle,
  // Additional Lucide Icons matching your new UI
  User, // for Face Control
  Aperture, // for Pose Control
  Sun, // for Lighting
  Eye, // for Depth Control
  SquareStack, // for Layers or Segments
  Grid, // for Grids/References
  RefreshCw, // for Re-rendering tools
  Scissors, // for Remove Background
  ArrowUp, ArrowDown, // for Import/Export
  Wand2, // for AI-based Tools
  Compass, // for Navigation / Scene control
  Ruler, // for Inpainting/Outpainting
  ZoomIn, ZoomOut, // for scaling
  Settings, Upload, Download, RotateCw, PlayCircle,
  Box, Share2, FileOutput, ImageIcon, Cog, DraftingCompass, Orbit, Atom, PersonStanding, LandPlot, ImageUpscale
} from 'lucide-react';

import { TbGridDots, TbImageInPicture, TbBulbFilled, TbCapture } from "react-icons/tb";
import { LuImageDown, LuImagePlus, LuImageMinus } from "react-icons/lu";
import { CiTurnR1, CiTimer } from "react-icons/ci";
import { FaRegFaceKissWinkHeart } from "react-icons/fa6";
import { PiSelectionBackground } from "react-icons/pi"
import { RxText } from "react-icons/rx";

import { NodeType } from '@/store/types';

import SvgIcon from '@/components/SvgIcon';

type NodeOption = {
  type: NodeType;
  label: string;
  icon: React.ElementType;
  description: string;
};

type NodeCategory = {
  name: string;
  icon: React.ElementType;
  options: NodeOption[];
};

type AssetItem = {
  name: string;
  type: string;
  image?: string;
};

export const insertCategories: NodeCategory[] = [
  {
    name: 'Controllers',
    icon: DraftingCompass,
    options: [
      {
        design: 'normal-node',
        functionality: 'control-net',
        type: 'control-net-pose',
        label: 'Pose Control',
        icon: "pose",
        description: 'Control pose of the subject',
      },
      {
        design: 'normal-node',
        functionality: 'control-net',
        type: 'control-net-edge',
        label: 'Edge Control',
        icon: "edge",
        description: 'Edge detection via Canny map',
      },
      {
        design: 'normal-node',
        functionality: 'control-net',
        type: 'control-net-lights',
        label: 'Lights Control',
        icon: "lights",
        description: 'Custom lighting map control',
      },
      {
        design: 'normal-node',
        functionality: 'control-net',
        type: 'control-net-face',
        label: 'Face Express',
        icon: "face",
        description: 'Facial expressions and identity',
      },
      {
        design: 'normal-node',
        functionality: 'control-net',
        type: 'control-net-segments',
        label: 'Segments',
        icon: "segments",
        description: 'Segment maps for regions',
      },
      {
        design: 'normal-node',
        functionality: 'control-net',
        type: 'control-net-depth',
        label: 'Depth Control',
        icon: "depth",
        description: 'Depth map control for composition',
      },
      {
        design: 'normal-node',
        functionality: 'control-net',
        type: 'control-net-normal-map',
        label: 'Normal Map',
        icon: "normal_map",
        description: 'Reference faces, styles, or objects',
      },
      {
        design: 'normal-node',
        functionality: 'control-net',
        type: 'control-net-reference',
        label: 'Reference',
        icon: "reference",
        description: 'Reference faces, styles, or objects',
      },
    ],
  },
  {
    name: 'Re-rendering',
    icon: Atom,
    options: [
      {
        design: 'normal-node',
        functionality: 'image-to-image',
        type: 'image-to-image-reimagine',
        label: 'Re-Imagine',
        icon: "reimagine",
        description: 'Recreate image with new style',
      },
      {
        design: 'normal-node',
        functionality: 'image-to-image',
        type: 'image-to-image-rescene',
        label: 'Re-Scene',
        icon: "rescene",
        description: 'Change scene and object context',
      },
      {
        design: 'normal-node',
        functionality: 'image-to-image',
        type: 'image-to-image-objectrelight',
        label: 'Object Re-Light',
        icon: "objectrelight",
        description: 'Change the lighting of the scene',
      },
      {
        design: 'normal-node',
        functionality: 'image-to-image',
        type: 'image-to-image-reangle',
        label: 'Re-Angle',
        icon: "reangle",
        description: 'Change the camera angle',
      },
    ],
  },
  {
    name: 'Tools',
    icon: Settings,
    options: [
      {
        design: 'normal-node',
        functionality: 'image-to-image',
        type: 'image-to-image-remove-bg',
        label: 'Remove BG',
        icon: "removebg",
        description: 'Erase image background',
      },
      {
        design: 'normal-node',
        functionality: 'image-to-image',
        type: 'image-to-image-upscale',
        label: 'Upscale',
        icon: "upscale",
        description: 'Increase image resolution',
      },
      {
        design: 'normal-node',
        functionality: 'image-to-image',
        type: 'image-to-image-inpainting',
        label: 'In-Painting',
        icon: "inpainting",
        description: 'Fill missing areas in the image',
      },
      {
        design: 'normal-node',
        functionality: 'image-to-image',
        type: 'image-to-image-remove-outpainting',
        label: 'Out-Painting',
        icon: "outpainting",
        description: 'Extend content beyond original image',
      },
      {
        design: 'normal-node',
        functionality: 'image-to-image',
        type: 'image-to-image-3d-maker',
        label: '3D Maker',
        icon: "3dmaker",
        description: 'Generate mesh and texture from image',
      },
      {
        design: 'normal-node',
        functionality: 'input',
        type: 'input-text',
        label: 'Text Prompt',
        icon: "text",
        description: 'Input text prompt for generation',
      },
      {
        design: 'normal-node',
        functionality: 'image-to-image',
        type: 'image-to-image-merger',
        label: 'Merger',
        icon: "merger",
        description: 'Merge multiple images with weights',
      },
      {
        design: 'custom-router',
        functionality: 'helper',
        type: 'connector',
        label: 'Router',
        icon: "router",
        description: 'Route connections in workflows',
      },
    ],
  },
  {
    name: 'Render',
    icon: FileOutput,
    options: [
      {
        design: 'image-node',
        functionality: 'preview',
        type: 'layer-image-node',
        data:{
          functionality: 'output',
        },
        label: 'Image Output',
        icon: "image_output",
        description: 'Final rendered image',
      },
      {
        design: 'image-node',
        functionality: 'preview',
        type: 'preview-realtime-node',
        data:{
          functionality: 'output'
        },
        label: 'Real-Time Preview',
        icon: "realtime",
        description: 'Live preview during generation',
      },
    ],
  },
  {
    name: 'Engines',
    icon: Cog,
    options: [

    ],
  },
  {
    name: 'Gears',
    icon: Orbit,
    options: [
    ],
  },
];


export const assetCategories = [
    {
      name: 'Components',
      icon: LayoutList,
      items: [
        { name: 'Component 1', type: 'component' },
        { name: 'Component 2', type: 'component' },
        { name: 'Untitled Component', type: 'component' },
      ] as AssetItem[]
    },
    {
      name: 'Renders',
      icon: FileImage,
      items: [
        { name: 'Render 1', type: 'render', image: 'https://images.unsplash.com/photo-1518770660439-4636190af475' },
        { name: 'Render 2', type: 'render', image: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5' },
        { name: 'Render 3', type: 'render', image: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158' },
        { name: 'Render 4', type: 'render', image: 'https://images.unsplash.com/photo-1470813740244-df37b8c1edcb' },
        { name: 'Render 5', type: 'render', image: 'https://images.unsplash.com/photo-1500673922987-e212871fec22' },
        { name: 'Render 6', type: 'render', image: 'https://images.unsplash.com/photo-1582562124811-c09040d0a901' },
      ] as AssetItem[]
    },
    {
      name: 'Uploaded',
      icon: Shuffle,
      items: [
        { name: 'Upload 1', type: 'upload', image: 'https://images.unsplash.com/photo-1649972904349-6e44c42644a7' },
        { name: 'Upload 2', type: 'upload', image: 'https://images.unsplash.com/photo-1518770660439-4636190af475' },
        { name: 'Upload 3', type: 'upload', image: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5' },
        { name: 'Upload 4', type: 'upload', image: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158' },
      ] as AssetItem[]
    }
  ];