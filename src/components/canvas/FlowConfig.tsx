
import { NodeTypes, EdgeTypes, ConnectionLineType } from '@xyflow/react';
import { ModelNode } from '../nodes/ModelNode';
import { LoraNode } from '../nodes/LoraNode';
import { ControlnetNode } from '../nodes/ControlnetNode';
import { PreviewNode } from '../nodes/PreviewNode';
import { InputNode } from '../nodes/InputNode';
import CustomEdge from '../edges/CustomEdge';

export const nodeTypes: NodeTypes = {
  modelNode: ModelNode,
  loraNode: LoraNode,
  controlnetNode: ControlnetNode,
  previewNode: PreviewNode,
  inputNode: InputNode,
};

export const edgeTypes: EdgeTypes = {
  custom: CustomEdge,
};

export const defaultEdgeOptions = {
  type: 'custom',
  animated: true,
  style: { strokeWidth: 2, stroke: '#666' }
};

export const connectionLineStyle = { 
  stroke: '#ff69b4', 
  strokeWidth: 3 
};

export const connectionLineType = ConnectionLineType.SmoothStep;
