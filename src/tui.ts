import { Plugin } from '@opencode/plugin/tui';
import { handleCommand } from './server/commands.js';

async function runPollCommand(context: any, input?: string) {
  const raw = (input || 'help').trim();
  const command = raw.startsWith('/poll') ? raw : `/poll ${raw}`;
  try {
    const result = await handleCommand(command);
    if (result.error) {
      context.ui.toast.show({ message: result.error, variant: 'error' });
      return;
    }
    if (result.response) {
      await context.ui.dialog.alert({ title: '🌸 Pollinations', message: result.response });
    }
  } catch (error: any) {
    context.ui.toast.show({ message: `Pollinations: ${error?.message || String(error)}`, variant: 'error' });
  }
}

export default Plugin.define({
  id: 'pollinations.tui',
  setup(context) {
    context.keymap.layer(() => ({
      mode: 'global',
      priority: 20,
      commands: [
        {
          id: 'pollinations.command',
          title: 'Pollinations',
          description: 'Pollinations account, quests, models and configuration',
          group: 'Pollinations',
          palette: true,
          slash: { name: 'poll', aliases: ['pollinations'], arguments: true },
          suggested: true,
          run: async (input?: string) => runPollCommand(context, input),
        },
      ],
      bindings: ['pollinations.command'],
    }));
  },
});
