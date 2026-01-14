'use client';

import { useState, useEffect, useCallback } from 'react';
import { Volume2, Play, Square, Mic, AlertCircle, Check, Loader2, Search, Globe } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface VoiceInfo {
  name: string;
  languageCode: string;
  language: string;
  country: string;
  sampleText: string;
  gender: 'male' | 'female' | 'unknown';
}

interface GroupedVoices {
  [region: string]: VoiceInfo[];
}

const API_BASE = 'http://localhost:3001';

export function VoiceSettings() {
  // State
  const [voices, setVoices] = useState<VoiceInfo[]>([]);
  const [groupedVoices, setGroupedVoices] = useState<GroupedVoices>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Current settings
  const [selectedVoice, setSelectedVoice] = useState('Samantha');
  const [speechRate, setSpeechRate] = useState([200]);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [wakeWordEnabled, setWakeWordEnabled] = useState(true);
  const [soundsEnabled, setSoundsEnabled] = useState(true);
  
  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRegion, setExpandedRegion] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalSettings, setOriginalSettings] = useState({ voice: 'Samantha', rate: 200, enabled: true });

  // Fetch voices on mount
  useEffect(() => {
    fetchVoices();
    fetchCurrentSettings();
  }, []);

  // Track changes
  useEffect(() => {
    const changed = 
      selectedVoice !== originalSettings.voice ||
      speechRate[0] !== originalSettings.rate ||
      voiceEnabled !== originalSettings.enabled;
    setHasChanges(changed);
  }, [selectedVoice, speechRate, voiceEnabled, originalSettings]);

  const fetchVoices = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_BASE}/api/voices`);
      if (!res.ok) throw new Error('Failed to fetch voices');
      
      const data = await res.json();
      setVoices(data.voices);
      setGroupedVoices(data.grouped);
      
      // Auto-expand English voices by default
      const englishRegion = Object.keys(data.grouped).find(r => r.startsWith('English'));
      if (englishRegion) {
        setExpandedRegion(englishRegion);
      }
    } catch (err) {
      setError('Failed to load voices. Is the backend running?');
      console.error('Failed to fetch voices:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentSettings = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/config`);
      if (!res.ok) return;
      
      const data = await res.json();
      const settings = {
        voice: data.tts?.voice || 'Daniel',
        rate: data.tts?.rate || 170,
        enabled: data.tts?.enabled ?? true,
      };
      
      setSelectedVoice(settings.voice);
      setSpeechRate([settings.rate]);
      setVoiceEnabled(settings.enabled);
      setOriginalSettings(settings);
    } catch (err) {
      console.error('Failed to fetch current settings:', err);
    }
  };

  const handleTestVoice = useCallback(async (voiceName?: string) => {
    try {
      setTesting(true);
      const voice = voiceName || selectedVoice;
      
      await fetch(`${API_BASE}/api/voices/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voice,
          rate: speechRate[0],
          text: `Hello, I am ${voice}. This is how I sound at ${speechRate[0]} words per minute.`,
        }),
      });
    } catch (err) {
      console.error('Failed to test voice:', err);
    } finally {
      setTesting(false);
    }
  }, [selectedVoice, speechRate]);

  const handleStopVoice = async () => {
    try {
      await fetch(`${API_BASE}/api/voices/stop`, { method: 'POST' });
      setTesting(false);
    } catch (err) {
      console.error('Failed to stop voice:', err);
    }
  };

  const handleApplyChanges = async () => {
    try {
      setSaving(true);
      
      const res = await fetch(`${API_BASE}/api/settings/voice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voice: selectedVoice,
          rate: speechRate[0],
          enabled: voiceEnabled,
        }),
      });
      
      if (!res.ok) throw new Error('Failed to save settings');
      
      // Update original settings after successful save
      setOriginalSettings({
        voice: selectedVoice,
        rate: speechRate[0],
        enabled: voiceEnabled,
      });
      
      setHasChanges(false);
    } catch (err) {
      console.error('Failed to apply changes:', err);
      setError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSelectVoice = (voice: VoiceInfo) => {
    setSelectedVoice(voice.name);
  };

  // Filter voices by search query
  const filteredGroupedVoices = Object.entries(groupedVoices).reduce((acc, [region, regionVoices]) => {
    if (!searchQuery) {
      acc[region] = regionVoices;
      return acc;
    }
    
    const filtered = regionVoices.filter(v => 
      v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.language.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.country.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    if (filtered.length > 0) {
      acc[region] = filtered;
    }
    return acc;
  }, {} as GroupedVoices);

  const sortedRegions = Object.keys(filteredGroupedVoices).sort((a, b) => {
    // Put English first
    if (a.startsWith('English') && !b.startsWith('English')) return -1;
    if (!a.startsWith('English') && b.startsWith('English')) return 1;
    return a.localeCompare(b);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-1">Voice Settings</h3>
        <p className="text-sm text-muted-foreground">
          Customize how JARVIS speaks and listens
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Voice Toggle */}
      <div className="flex items-center justify-between p-4 rounded-lg bg-card border border-border">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Volume2 className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="font-medium text-sm">Voice Output</p>
            <p className="text-xs text-muted-foreground">Enable text-to-speech responses</p>
          </div>
        </div>
        <Switch checked={voiceEnabled} onCheckedChange={setVoiceEnabled} />
      </div>

      {/* Speech Rate */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Speech Rate</label>
          <span className="text-sm font-mono text-primary">{speechRate[0]} WPM</span>
        </div>
        <Slider
          value={speechRate}
          onValueChange={setSpeechRate}
          min={80}
          max={300}
          step={10}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>80 (Slow)</span>
          <span>170 (Normal)</span>
          <span>300 (Fast)</span>
        </div>
      </div>

      {/* Voice Selection */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Assistant Voice</label>
          <Badge variant="outline" className="font-mono">
            {selectedVoice}
          </Badge>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search voices by name or language..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Voice List */}
        <ScrollArea className="h-[280px] rounded-lg border border-border">
          <div className="p-2 space-y-1">
            {sortedRegions.map((region) => (
              <div key={region} className="mb-2">
                {/* Region Header */}
                <button
                  onClick={() => setExpandedRegion(expandedRegion === region ? null : region)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-md bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{region}</span>
                    <Badge variant="secondary" className="text-xs">
                      {filteredGroupedVoices[region].length}
                    </Badge>
                  </div>
                  <span className="text-muted-foreground text-xs">
                    {expandedRegion === region ? '▼' : '▶'}
                  </span>
                </button>

                {/* Voice Items */}
                {expandedRegion === region && (
                  <div className="mt-1 ml-2 space-y-1">
                    {filteredGroupedVoices[region].map((voice) => (
                      <div
                        key={voice.name}
                        onClick={() => handleSelectVoice(voice)}
                        className={cn(
                          'flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all',
                          selectedVoice === voice.name
                            ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                            : 'border-border bg-card hover:border-primary/50 hover:bg-card/80'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <span className={cn(
                            'w-2.5 h-2.5 rounded-full',
                            voice.gender === 'female' ? 'bg-pink-500' : 'bg-blue-500'
                          )} />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{voice.name}</span>
                              {selectedVoice === voice.name && (
                                <Check className="h-3.5 w-3.5 text-primary" />
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {voice.gender === 'female' ? '♀' : '♂'} {voice.language}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTestVoice(voice.name);
                          }}
                        >
                          <Play className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Test & Apply Buttons */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={() => testing ? handleStopVoice() : handleTestVoice()}
          disabled={!voiceEnabled}
          className="flex-1"
        >
          {testing ? (
            <>
              <Square className="h-4 w-4 mr-2" />
              Stop
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Test Voice
            </>
          )}
        </Button>
        <Button
          onClick={handleApplyChanges}
          disabled={!hasChanges || saving}
          className="flex-1"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Check className="h-4 w-4 mr-2" />
              Apply Changes
            </>
          )}
        </Button>
      </div>

      {hasChanges && (
        <p className="text-xs text-center text-warning">
          You have unsaved changes
        </p>
      )}

      {/* Wake Word */}
      <div className="flex items-center justify-between p-4 rounded-lg bg-card border border-border">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-success/10">
            <Mic className="h-4 w-4 text-success" />
          </div>
          <div>
            <p className="font-medium text-sm">Wake Word Detection</p>
            <p className="text-xs text-muted-foreground">Say "Hey JARVIS" to activate</p>
          </div>
        </div>
        <Switch checked={wakeWordEnabled} onCheckedChange={setWakeWordEnabled} />
      </div>

      {/* Sound Effects */}
      <div className="flex items-center justify-between p-4 rounded-lg bg-card border border-border">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-warning/10">
            <Volume2 className="h-4 w-4 text-warning" />
          </div>
          <div>
            <p className="font-medium text-sm">Sound Effects</p>
            <p className="text-xs text-muted-foreground">Play sounds for actions</p>
          </div>
        </div>
        <Switch checked={soundsEnabled} onCheckedChange={setSoundsEnabled} />
      </div>

      {/* Info */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border border-border">
        <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
        <p className="text-xs text-muted-foreground">
          Found <span className="font-medium text-foreground">{voices.length}</span> voices on your system. 
          Voice availability depends on macOS language packs installed.
        </p>
      </div>
    </div>
  );
}
