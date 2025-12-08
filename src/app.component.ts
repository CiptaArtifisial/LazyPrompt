
import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
  inject,
  AfterViewInit,
  ViewChild,
  ElementRef,
  effect,
  ChangeDetectorRef,
  untracked,
  // FIX: Import WritableSignal to resolve type errors for signal inputs in methods.
  WritableSignal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { GeminiService, PolishedPrompt } from './services/gemini.service';
import { LocalStorageService, HistoryItem, Preset } from './services/local-storage.service';
import { ThreeDSceneService, SceneStatus } from './services/three-d-scene.service';

const CAMERA_DATA = {
  "Digital Cinema": { models: ["ARRI Alexa Mini LF", "ARRI Alexa 65", "Sony Venice 2", "RED V-Raptor XL", "IMAX Digital Camera"], lenses: ["Arri Signature Primes", "Panavision C-Series Anamorphic", "Cooke S4/i Primes", "Zeiss Supreme Primes"] },
  "Mirrorless": { models: ["Sony A7S III", "Canon EOS R5 C", "Panasonic Lumix S1H", "Fujifilm X-H2S"], lenses: ["Sony G Master Primes", "Canon RF L-Series", "Sigma Art Series", "Voigtländer Nokton"] },
  "Analog Film": { models: ["Arriflex 435", "Panavision Panaflex Millennium", "Kodak Super 8"], lenses: ["Zeiss Super Speeds", "Cooke Panchro Classics", "Canon K-35"] },
  "Photography": { models: ["Leica M6", "Hasselblad 500C/M", "Mamiya RZ67", "Polaroid SX-70"], lenses: ["Leica Summilux-M 35mm", "Carl Zeiss Planar 80mm", "Mamiya Sekor Z"] }
};

type AppTab = 'creation' | 'editing' | 'history';
type OutputMode = 'general' | 'midjourney' | 'json';
type ViewLang = 'en' | 'id';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule]
})
export class AppComponent implements AfterViewInit {
  // Services
  private geminiService = inject(GeminiService);
  private lsService = inject(LocalStorageService);
  private sceneService = inject(ThreeDSceneService);
  private cdr = inject(ChangeDetectorRef);

  // View Children for 3D canvas
  @ViewChild('simContainerCreation') simContainerCreation!: ElementRef<HTMLElement>;
  @ViewChild('simContainerEditing') simContainerEditing!: ElementRef<HTMLElement>;
  
  // UI State
  activeTab = signal<AppTab>('creation');
  toastMessage = signal('');
  isEnriching = signal(false);
  isPolishing = signal(false);

  // Prompt Cache for dual language
  promptCache = signal<PolishedPrompt | null>(null);
  viewLanguage = signal<ViewLang>('en');

  // Creation State
  primarySubject = signal('');
  overallStyles = signal<string[]>([]);
  dominantMoods = signal('');
  cameraCategory = signal('');
  cameraModel = signal('');
  cameraLens = signal('');
  lighting = signal('');
  detailTextures = signal<string[]>([]);
  artistRef = signal('');
  negativePrompt = signal('');

  // Editing State
  editTaskType = signal('change');
  editSubject = signal('');
  editSeamless = signal(true);
  editMatchLighting = signal(true);
  editHighDetail = signal(false);
  editNegative = signal('seams, glitch, bad blend, floating objects');

  // 3D Sim State
  simDistance = signal(5);
  simHeight = signal(0.5);
  simOrbit = signal(0);
  sceneStatus = signal<SceneStatus>({ shot: '', angle: '', view: '' });
  
  // Output State
  outputMode = signal<OutputMode>('general');
  aspectRatio = signal('');
  mjStylize = signal(250);
  mjChaos = signal(0);
  mjNiji = signal(false);

  // History & Presets
  history = signal<HistoryItem[]>([]);
  presets = signal<Preset[]>([]);
  selectedPresetId = signal<string>('');
  
  // Computed Camera Data
  cameraCategories = computed(() => Object.keys(CAMERA_DATA));
  cameraModels = computed(() => this.cameraCategory() ? CAMERA_DATA[this.cameraCategory() as keyof typeof CAMERA_DATA].models : []);
  cameraLenses = computed(() => this.cameraCategory() ? CAMERA_DATA[this.cameraCategory() as keyof typeof CAMERA_DATA].lenses : []);

  // THE BIG ONE: Computed final prompt
  generatedPrompt = computed(() => {
    // This computed depends on many signals. When any of them change, it recalculates.
    const mode = this.outputMode();
    let parts: string[] = [];
    let negative = '';

    if (this.activeTab() === 'creation') {
        const subject = this.primarySubject().trim();
        if (!subject) return "Masukkan subjek di form penciptaan...";
        
        parts.push(subject);
        if (this.dominantMoods()) parts.push(`${this.dominantMoods()} mood`);
        if (this.overallStyles().length > 0) parts.push(`Style: ${this.overallStyles().join(', ')}`);
        
        const camParts = [
            this.cameraModel() ? `shot on ${this.cameraModel()}` : (this.cameraCategory() === 'Analog Film' ? "Analog Film aesthetic" : ''),
            this.cameraLens() ? `with ${this.cameraLens()}` : '',
            this.lighting() ? `${this.lighting()}` : ''
        ].filter(Boolean);
        if (camParts.length > 0) parts.push(camParts.join(', '));
        
        const status = this.sceneStatus();
        const compParts = [status.shot, status.angle !== 'Eye Level' ? status.angle : '', status.view !== 'Front View' ? status.view : ''].filter(Boolean);
        if (compParts.length > 0) parts.push(compParts.join(', '));
        
        if (this.detailTextures().length > 0) parts.push(this.detailTextures().join(', '));
        if (this.artistRef()) parts.push(`art by ${this.artistRef()}`);
        
        negative = this.negativePrompt().trim();

    } else if (this.activeTab() === 'editing') {
        const subject = this.editSubject().trim();
        if (!subject) return "Masukkan objek perubahan di form renovasi...";

        parts.push(subject);
        const mods = [this.editSeamless() ? 'seamless blend' : '', this.editMatchLighting() ? 'matching lighting' : '', this.editHighDetail() ? 'highly detailed' : ''].filter(Boolean);
        if(mods.length > 0) parts.push(mods.join(', '));

        const status = this.sceneStatus();
        const compParts = [status.shot, status.angle !== 'Eye Level' ? status.angle : '', status.view !== 'Front View' ? status.view : ''].filter(Boolean);
        if (compParts.length > 0) parts.push(compParts.join(', '));

        negative = this.editNegative().trim();
    } else {
        return "";
    }
    
    const rawPrompt = parts.filter(p => p.trim() !== '').join(', ');

    if (mode === 'json') {
      return JSON.stringify({ prompt: rawPrompt, negative_prompt: negative, aspect_ratio: this.aspectRatio() || '1:1' }, null, 2);
    }

    let finalOutput = rawPrompt;
    let suffix = '';
    
    if (this.aspectRatio()) suffix += ` --ar ${this.aspectRatio()}`;
    
    if (mode === 'midjourney') {
      if (this.mjStylize() !== 250) suffix += ` --s ${this.mjStylize()}`;
      if (this.mjChaos() !== 0) suffix += ` --c ${this.mjChaos()}`;
      suffix += this.mjNiji() ? ` --niji 6` : ` --v 6.0`;
    }
    
    if (negative) suffix += ` --no ${negative}`;
    finalOutput += suffix;
    
    if (mode === 'midjourney') finalOutput = `/imagine prompt: ${finalOutput}`;
    
    return finalOutput;
  });

  displayedPrompt = computed(() => {
    const lang = this.viewLanguage();
    const cache = this.promptCache();
    const generated = this.generatedPrompt();

    if (lang === 'en' && cache?.en) return cache.en;
    if (lang === 'id' && cache?.id) return cache.id;
    
    return generated;
  });

  constructor() {
    this.history.set(this.lsService.getHistory());
    this.presets.set(this.lsService.getPresets());

    // Effect to update 3D scene when sliders change
    effect(() => {
      const status = this.sceneService.updateCameraPosition(this.simDistance(), this.simHeight(), this.simOrbit());
      this.sceneStatus.set(status);
    });

    // Effect to reset prompt cache when core inputs change
    effect(() => {
        // Track all signals that should invalidate the polished prompt
        this.primarySubject(); this.overallStyles(); this.dominantMoods(); this.cameraCategory(); this.cameraModel(); this.cameraLens(); this.lighting(); this.detailTextures(); this.artistRef(); this.negativePrompt(); this.editTaskType(); this.editSubject(); this.editSeamless(); this.editMatchLighting(); this.editHighDetail(); this.editNegative(); this.outputMode(); this.aspectRatio(); this.mjStylize(); this.mjChaos(); this.mjNiji();
        
        // When any of these change, reset the cache.
        untracked(() => this.promptCache.set(null));
    });

    // Effect to handle preset loading
    effect(() => {
        const id = this.selectedPresetId();
        if (id) {
            const preset = this.presets().find(p => p.id === id);
            if (preset) {
              this.loadStateFromPreset(preset.state);
            }
        }
    });
  }

  ngAfterViewInit(): void {
    this.sceneService.initializeScene(this.simContainerCreation.nativeElement);
  }

  // Methods
  setTab(tab: AppTab) {
    this.activeTab.set(tab);
    // Move the canvas
    if (this.sceneService.renderer) {
      if (tab === 'creation' && this.simContainerCreation) {
        this.simContainerCreation.nativeElement.appendChild(this.sceneService.renderer.domElement);
      } else if (tab === 'editing' && this.simContainerEditing) {
        this.simContainerEditing.nativeElement.appendChild(this.sceneService.renderer.domElement);
      }
    }
  }

  updateSignal(signal: WritableSignal<any>, event: Event) {
    const target = event.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
    const value = target.type === 'checkbox' ? (target as HTMLInputElement).checked : target.value;
    signal.set(value);
  }

  updateSlider(signal: WritableSignal<number>, event: Event) {
    const target = event.target as HTMLInputElement;
    signal.set(Number(target.value));
  }

  addTag(type: 'style' | 'detail', event: Event) {
    const select = event.target as HTMLSelectElement;
    if (!select.value) return;
    if (type === 'style') {
      this.overallStyles.update(s => [...s, select.value]);
    } else {
      this.detailTextures.update(d => [...d, select.value]);
    }
    select.value = '';
  }

  removeTag(type: 'style' | 'detail', tag: string) {
    if (type === 'style') {
      this.overallStyles.update(s => s.filter(i => i !== tag));
    } else {
      this.detailTextures.update(d => d.filter(i => i !== tag));
    }
  }

  copyPrompt() {
    const text = this.displayedPrompt();
    if (text.includes('...')) return;
    navigator.clipboard.writeText(text).then(() => {
      this.showToast('Prompt disalin!');
      this.lsService.saveToHistory(text);
      this.history.set(this.lsService.getHistory());
    });
  }

  async enrich() {
    if (!this.primarySubject() || this.isEnriching()) return;
    this.isEnriching.set(true);
    try {
      const enriched = await this.geminiService.enrichIdea(this.primarySubject());
      this.primarySubject.set(enriched);
      this.showToast('Ide berhasil diperkaya!');
    } catch (e) {
      this.showToast('Gagal terhubung ke Gemini.', true);
    } finally {
      this.isEnriching.set(false);
    }
  }

  async polish() {
    const rawPrompt = this.generatedPrompt();
    if (rawPrompt.includes('...') || this.isPolishing() || this.outputMode() === 'json') {
      if (this.outputMode() === 'json') this.showToast('Fitur poles tidak support mode JSON.', true);
      return;
    }
    this.isPolishing.set(true);
    
    const promptToPolish = rawPrompt.replace('/imagine prompt:', '').replace(/--\w+\s*([^\s]+)?/g, '').trim();

    try {
      const polished = await this.geminiService.polishPrompt(promptToPolish);
      
      const suffix = rawPrompt.match(/--\w+\s*([^\s]+)?/g)?.join(' ') || '';
      const prefix = this.outputMode() === 'midjourney' ? '/imagine prompt: ' : '';
      
      this.promptCache.set({
        en: prefix + polished.en + (suffix ? ' ' + suffix : ''),
        id: prefix + polished.id + (suffix ? ' ' + suffix : '')
      });

      this.showToast('Prompt dual-bahasa siap!');
    } catch (e) {
      this.showToast('Gagal memoles prompt.', true);
    } finally {
      this.isPolishing.set(false);
    }
  }

  resetForm() {
    if(!confirm("Anda yakin ingin mereset semua isian?")) return;
    this.primarySubject.set(''); this.overallStyles.set([]); this.dominantMoods.set(''); this.cameraCategory.set(''); this.cameraModel.set(''); this.cameraLens.set(''); this.lighting.set(''); this.detailTextures.set([]); this.artistRef.set(''); this.negativePrompt.set('');
    this.editTaskType.set('change'); this.editSubject.set(''); this.editSeamless.set(true); this.editMatchLighting.set(true); this.editHighDetail.set(false); this.editNegative.set('seams, glitch, bad blend, floating objects');
    this.simDistance.set(5); this.simHeight.set(0.5); this.simOrbit.set(0);
    this.outputMode.set('general'); this.aspectRatio.set(''); this.mjStylize.set(250); this.mjChaos.set(0); this.mjNiji.set(false);
    this.selectedPresetId.set('');
  }

  clearHistory() {
    if(!confirm("Hapus semua riwayat?")) return;
    this.lsService.clearHistory();
    this.history.set([]);
  }

  savePreset() {
    const name = prompt("Masukkan nama untuk preset ini:");
    if (!name) return;
    
    const state = this.captureState();
    const newPreset = this.lsService.savePreset(name, state);
    this.presets.update(p => [...p, newPreset]);
    this.selectedPresetId.set(newPreset.id);
    this.showToast(`Preset "${name}" disimpan!`);
  }

  deletePreset() {
    const id = this.selectedPresetId();
    if (!id) {
        this.showToast('Pilih preset untuk dihapus.', true);
        return;
    }
    if(!confirm("Anda yakin ingin menghapus preset ini?")) return;
    
    this.lsService.deletePreset(id);
    this.presets.update(p => p.filter(preset => preset.id !== id));
    this.selectedPresetId.set('');
    this.showToast('Preset dihapus.');
  }

  private captureState() {
    return {
        primarySubject: this.primarySubject(), overallStyles: this.overallStyles(), dominantMoods: this.dominantMoods(), cameraCategory: this.cameraCategory(), cameraModel: this.cameraModel(), cameraLens: this.cameraLens(), lighting: this.lighting(), detailTextures: this.detailTextures(), artistRef: this.artistRef(), negativePrompt: this.negativePrompt(),
        simDistance: this.simDistance(), simHeight: this.simHeight(), simOrbit: this.simOrbit(),
        outputMode: this.outputMode(), aspectRatio: this.aspectRatio(), mjStylize: this.mjStylize(), mjChaos: this.mjChaos(), mjNiji: this.mjNiji(),
    };
  }

  private loadStateFromPreset(state: any) {
    this.primarySubject.set(state.primarySubject || ''); this.overallStyles.set(state.overallStyles || []); this.dominantMoods.set(state.dominantMoods || ''); this.cameraCategory.set(state.cameraCategory || '');
    // Need a tick to let computed values update before setting model/lens
    setTimeout(() => {
        this.cameraModel.set(state.cameraModel || '');
        this.cameraLens.set(state.cameraLens || '');
        this.cdr.detectChanges();
    });
    this.lighting.set(state.lighting || ''); this.detailTextures.set(state.detailTextures || []); this.artistRef.set(state.artistRef || ''); this.negativePrompt.set(state.negativePrompt || '');
    this.simDistance.set(state.simDistance || 5); this.simHeight.set(state.simHeight || 0.5); this.simOrbit.set(state.simOrbit || 0);
    this.outputMode.set(state.outputMode || 'general'); this.aspectRatio.set(state.aspectRatio || ''); this.mjStylize.set(state.mjStylize || 250); this.mjChaos.set(state.mjChaos || 0); this.mjNiji.set(state.mjNiji || false);
    this.showToast('Preset dimuat!');
  }

  private showToast(message: string, isError = false) {
    this.toastMessage.set(message);
    setTimeout(() => this.toastMessage.set(''), 3000);
  }
}