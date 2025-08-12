// @ts-nocheck
import { defineSignal, setHandler } from '@temporalio/workflow';

export const humanApproval = defineSignal('humanApproval');

export async function aiAgentWorkflow(userId: string, task: string): Promise<string> {
  let approved = false;
  setHandler(humanApproval, () => { approved = true; });

  // Simulate work steps
  const steps = [
    `Analyze task: ${task}`,
    'Plan tools',
    'Draft answer'
  ];

  // If approval required (simple heuristic), wait up to a day
  if (task.toLowerCase().includes('sensitive')) {
    const oneDay = 24 * 60 * 60 * 1000;
    const deadline = Date.now() + oneDay;
    while (!approved && Date.now() < deadline) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  return `user:${userId}|completed:${steps.length}`;
}