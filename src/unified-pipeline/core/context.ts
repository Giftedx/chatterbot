export enum InputType {
  Message = 'message',
  Task = 'task',
  Reply = 'reply',
}

export enum CognitiveOperation {
  Processing = 'processing',
  Reasoning = 'reasoning',
  Understanding = 'understanding',
  Remembering = 'remembering',
  Researching = 'researching',
}

export interface UnifiedPipelineContext {
  inputType: InputType;
  cognitiveOperation: CognitiveOperation;
  data: any;
  metadata?: Record<string, any>;
}
