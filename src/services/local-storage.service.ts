
import { Injectable, WritableSignal } from '@angular/core';

export interface HistoryItem {
  text: string;
  time: string;
}

export interface Preset {
  id: string;
  name:string;
  state: any;
}

@Injectable({ providedIn: 'root' })
export class LocalStorageService {

  private readonly HISTORY_KEY = 'promptHistory_v2';
  private readonly PRESETS_KEY = 'promptPresets_v2';
  private readonly HISTORY_LIMIT = 10;

  getHistory(): HistoryItem[] {
    try {
      const historyJson = localStorage.getItem(this.HISTORY_KEY);
      return historyJson ? JSON.parse(historyJson) : [];
    } catch (e) {
      console.error("Error reading history from localStorage", e);
      return [];
    }
  }

  saveToHistory(prompt: string) {
    if (!prompt) return;
    const history = this.getHistory();
    const timestamp = new Date().toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' });
    
    if (history.length > 0 && history[0].text === prompt) return;
    
    const newHistory: HistoryItem[] = [{ text: prompt, time: timestamp }, ...history].slice(0, this.HISTORY_LIMIT);
    
    try {
      localStorage.setItem(this.HISTORY_KEY, JSON.stringify(newHistory));
    } catch (e) {
      console.error("Error saving history to localStorage", e);
    }
  }

  clearHistory() {
    localStorage.removeItem(this.HISTORY_KEY);
  }

  getPresets(): Preset[] {
    try {
      const presetsJson = localStorage.getItem(this.PRESETS_KEY);
      return presetsJson ? JSON.parse(presetsJson) : [];
    } catch (e) {
      console.error("Error reading presets from localStorage", e);
      return [];
    }
  }

  savePreset(name: string, state: any): Preset {
     const presets = this.getPresets();
     const newPreset: Preset = { id: Date.now().toString(), name, state };
     presets.push(newPreset);
     try {
       localStorage.setItem(this.PRESETS_KEY, JSON.stringify(presets));
     } catch (e) {
        console.error("Error saving preset to localStorage", e);
     }
     return newPreset;
  }

  deletePreset(id: string) {
    let presets = this.getPresets();
    presets = presets.filter(p => p.id !== id);
    try {
      localStorage.setItem(this.PRESETS_KEY, JSON.stringify(presets));
    } catch (e) {
      console.error("Error deleting preset from localStorage", e);
    }
  }
}
