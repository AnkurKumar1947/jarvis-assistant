'use client';

import { useState } from 'react';
import { Settings, Volume2, Palette, Keyboard, Info, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { VoiceSettings } from './VoiceSettings';
import { ThemeSettings } from './ThemeSettings';
import { cn } from '@/lib/utils';

type SettingsTab = 'voice' | 'theme' | 'shortcuts' | 'about';

interface SettingsDialogProps {
  trigger?: React.ReactNode;
}

const tabs: { id: SettingsTab; label: string; icon: React.ElementType }[] = [
  { id: 'voice', label: 'Voice', icon: Volume2 },
  { id: 'theme', label: 'Theme', icon: Palette },
  { id: 'shortcuts', label: 'Shortcuts', icon: Keyboard },
  { id: 'about', label: 'About', icon: Info },
];

export function SettingsDialog({ trigger }: SettingsDialogProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('voice');
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon">
            <Settings className="h-5 w-5" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            Settings
          </DialogTitle>
        </DialogHeader>

        <div className="flex min-h-[400px]">
          {/* Sidebar */}
          <div className="w-48 border-r border-border bg-card/50 p-2">
            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    activeTab === tab.id
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  )}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            {activeTab === 'voice' && <VoiceSettings />}
            {activeTab === 'theme' && <ThemeSettings />}
            {activeTab === 'shortcuts' && <ShortcutsSettings />}
            {activeTab === 'about' && <AboutSettings />}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ShortcutsSettings() {
  const shortcuts = [
    { key: 'Space', action: 'Toggle listening', description: 'Start or stop voice input' },
    { key: 'Enter', action: 'Send message', description: 'Send the typed message' },
    { key: 'M', action: 'Toggle mute', description: 'Mute or unmute assistant voice' },
    { key: 'C', action: 'Toggle camera', description: 'Turn camera on or off' },
    { key: ',', action: 'Open settings', description: 'Open this settings dialog' },
    { key: 'Esc', action: 'Close dialog', description: 'Close any open dialog' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-1">Keyboard Shortcuts</h3>
        <p className="text-sm text-muted-foreground">
          Quick actions to control the assistant
        </p>
      </div>

      <div className="space-y-3">
        {shortcuts.map((shortcut) => (
          <div
            key={shortcut.key}
            className="flex items-center justify-between p-3 rounded-lg bg-card border border-border"
          >
            <div>
              <p className="font-medium text-sm">{shortcut.action}</p>
              <p className="text-xs text-muted-foreground">{shortcut.description}</p>
            </div>
            <kbd className="px-2.5 py-1.5 text-xs font-mono bg-muted rounded-md border border-border">
              {shortcut.key}
            </kbd>
          </div>
        ))}
      </div>
    </div>
  );
}

function AboutSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-1">About JARVIS</h3>
        <p className="text-sm text-muted-foreground">
          Your personal AI assistant
        </p>
      </div>

      <div className="space-y-4">
        <div className="p-4 rounded-lg bg-card border border-border">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <span className="text-2xl">🤖</span>
            </div>
            <div>
              <h4 className="font-semibold">JARVIS Assistant</h4>
              <p className="text-sm text-muted-foreground">Version 1.0.0</p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-medium">Features</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Voice commands with wake word detection</li>
            <li>• Real-time system metrics monitoring</li>
            <li>• Camera integration</li>
            <li>• Multiple theme options</li>
            <li>• Customizable voice settings</li>
          </ul>
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-medium">Tech Stack</h4>
          <div className="flex flex-wrap gap-2">
            {['Next.js', 'React', 'TypeScript', 'Tailwind CSS', 'Socket.io', 'Whisper'].map((tech) => (
              <span
                key={tech}
                className="px-2 py-1 text-xs rounded-full bg-muted text-muted-foreground"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>

        <div className="pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            Inspired by the AI assistant from Iron Man
          </p>
        </div>
      </div>
    </div>
  );
}

export { SettingsDialog as default };

