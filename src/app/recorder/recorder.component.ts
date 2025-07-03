import { Component, ElementRef, OnDestroy, OnInit, signal, ViewChild, WritableSignal } from '@angular/core';
import AudioMotionAnalyzer from 'audiomotion-analyzer';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatButtonModule, MatIconButton } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatMenuModule } from '@angular/material/menu';
import WaveSurfer from 'wavesurfer.js'
@Component({
  selector: 'app-recorder',
  imports: [
    MatCard,
    MatCardContent,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatMenuModule
  ],
  templateUrl: './recorder.component.html',
  styleUrl: './recorder.component.scss'
})
export class RecorderComponent {
  @ViewChild('analyzerContainer', { static: false }) containerRef!: ElementRef;
  // @ViewChild('audioPlay', { static: false }) audioPlayRef!: ElementRef;
  // @ViewChild('hiddenSelect', { static: false }) hiddenSelect!: IonSelect;
  audioPlay: WritableSignal<HTMLAudioElement | null> = signal(null);
  private analyzer!: AudioMotionAnalyzer;
  private stream!: MediaStream;
  private audioContext!: AudioContext;
  microphones: MediaDeviceInfo[] = [];
  // private sourceNode!: MediaStreamAudioSourceNode;
  mediaRecorder!: MediaRecorder;
  isPlaying: boolean = false;
  selectedDeviceId: string | undefined = '';

  audioChunks: Blob[] = [];
  audioUrl: WritableSignal<string | null> = signal(null);
  isRecording = false;
  recordTime: WritableSignal<string> = signal('00:00');
  setTimeout!: any;
  duretionRecord: WritableSignal<number> = signal(0);
  display: WritableSignal<string> = signal("00:00");
  prograssVal: WritableSignal<number> = signal(0);
  puaseTime: number = 0;
  wave!: WaveSurfer;
  constructor() { }

  async ngOnInit() {
    const devices = await navigator.mediaDevices.enumerateDevices();
    this.microphones = devices.filter(device => device.kind === 'audioinput');
    if (this.microphones.length !== 0) {
      const defaultValue = this.microphones.find(d => d.deviceId === "default");
      this.selectedDeviceId = defaultValue?.deviceId;
    }
  }

  ngAfterViewInit(): void {
    this.createVisual();
  }

  createRecorder(audio: any) {
    const container = this.containerRef.nativeElement;
    const wavesurfer = WaveSurfer.create({
      container: container,
      waveColor: '#4F4A85',
      progressColor: '#383351',
      url: audio,
    });
  }

  createVisual() {
    const container = this.containerRef.nativeElement;
    this.analyzer = new AudioMotionAnalyzer(container, {
      height: 400,
      ansiBands: false,
      showScaleX: false,
      bgAlpha: 0,
      overlay: true,
      smoothing: 0.7,
      mode: 0,
      channelLayout: "single",
      frequencyScale: "bark",
      gradient: "prism",
      linearAmplitude: true,
      linearBoost: 1.8,
      mirror: 0,
      radial: false,
      reflexAlpha: 0.25,
      reflexBright: 1,
      reflexFit: true,
      reflexRatio: 0.3,
      showPeaks: true,
      weightingFilter: "D"
    });
  }

  openPopup(event: UIEvent) {
    // this.hiddenSelect.open();
  }

  handleChange(event: CustomEvent) {
    console.log(event.detail.value);
    if (event.detail.value !== this.selectedDeviceId) {
      this.setUserMedia(event.detail.value);
    }
  }

  get currentTime() {
    return Math.floor(this.audioPlay()?.currentTime || 0);
  }
  async startRecording() {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.mediaRecorder = new MediaRecorder(this.stream);
    this.audioChunks = [];
    const source = this.analyzer.audioCtx.createMediaStreamSource(this.stream);

    this.analyzer.connectInput(source);
    this.analyzer.volume = 0;
    
    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };
    this.mediaRecorder.onstop = () => {
      const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
      this.audioUrl.set(URL.createObjectURL(audioBlob));

      this.audioPlay.set(new Audio(URL.createObjectURL(audioBlob)));
      this.analyzer.destroy();
      this.wave = WaveSurfer.create({
        container: '#waveform',
        waveColor: '#4F4A85',
        progressColor: '#383351',
      });
      this.wave.load(this.audioUrl() as string);
      this.stream.getTracks().forEach(track => track.stop()); // cleanup
      this.analyzer.start();
      // this.analyzer.connectInput(this.audioPlay() as any);
      this.duretionRecord.set(0)
      this.display.set("00:00");
      if (this.setTimeout) {
        clearInterval(this.setTimeout);
        this.recordTime.set("00:00");
        this.puaseTime = 0;
      }
      this.audioPlay()?.addEventListener('ended', () => {
        this.isPlaying = false;
      });

      this.audioPlay()?.addEventListener('loadedmetadata', () => {
        this.duretionRecord.set(Math.floor(this.audioPlay()?.duration || 0))
        console.log('Total duration:', this.audioPlay()?.duration);
      });

      this.audioPlay()?.addEventListener('timeupdate', () => {
        const seconds = Math.floor(this.audioPlay()?.currentTime || 0);
        const minutes = Math.floor(seconds / 60);
        const display = `${this.pad(minutes)}:${this.pad(seconds % 60)}`;
        this.prograssVal.set(Math.floor((seconds / this.duretionRecord())*100))
        this.display.set(display);
      });
    };

    this.mediaRecorder.onstart = () => {
      this.recodringTimeCount();
    }
    this.mediaRecorder.onpause = () => {
      console.log("Pause")
    }

    this.mediaRecorder.onresume = () => {
      console.log("resume")
    }

    this.mediaRecorder.start();
    this.isRecording = true;
  }
  pad(num: number): string {
    return num < 10 ? '0' + num : '' + num;
  }
  recodringTimeCount() {
    if (this.setTimeout) clearInterval(this.setTimeout);
      this.setTimeout = setInterval(() => {
        this.puaseTime++;
        let val = Math.floor(this.puaseTime / 60)
        const minute = val <= 9 ? "0"+val : val ;
        val = Math.floor(this.puaseTime % 60);
        const second = val <= 9 ? "0"+val : val;
        this.recordTime.set(minute+":"+second);
      }, 1000);
  }

  importRecord() {

  }
  downloadRecording() {

  }

  removeRecording() {
    this.audioUrl.set(null);
    this.audioPlay.set(new Audio());
    this.analyzer.destroy();
    this.createVisual();
  }
  pauseRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
      this.mediaRecorder.resume();
      this.analyzer.start();
      this.recodringTimeCount();
    } else if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.analyzer.stop();
      this.mediaRecorder.pause();
      clearInterval(this.setTimeout);
    }
  }
  stopRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
      this.isRecording = false;
    }
  }
  
  playRecording() {
    if (!this.isPlaying) {
      this.audioPlay()?.play();
      // this.analyzer.volume = 1;
      this.isPlaying = true;
    } else {
      this.isPlaying = false;
      this.audioPlay()?.pause();
    }
  }

  setUserMedia(selectedMicId: string) {
    navigator.mediaDevices.getUserMedia({
      audio: { deviceId: selectedMicId }
    });
  }

  ngOnDestroy() {
    if (this.analyzer) this.analyzer.destroy();
    if (this.audioContext) this.audioContext.close();
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }
  }
}
