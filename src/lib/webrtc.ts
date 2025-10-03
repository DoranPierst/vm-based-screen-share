export class WebRTCManager {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private onRemoteStream: ((stream: MediaStream) => void) | null = null;
  private onControlSignal: ((data: any) => void) | null = null;
  private dataChannel: RTCDataChannel | null = null;

  constructor() {
    this.initializePeerConnection();
  }

  private initializePeerConnection(): void {
    this.peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    });

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('New ICE candidate:', event.candidate);
      }
    };

    this.peerConnection.ontrack = (event) => {
      if (this.onRemoteStream && event.streams[0]) {
        this.onRemoteStream(event.streams[0]);
      }
    };
  }

  async startScreenShare(): Promise<void> {
    try {
      this.localStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: 'always',
        } as any,
        audio: false,
      });

      if (this.peerConnection) {
        this.localStream.getTracks().forEach((track) => {
          this.peerConnection!.addTrack(track, this.localStream!);
        });

        this.dataChannel = this.peerConnection.createDataChannel('control');
        this.setupDataChannel();
      }
    } catch (error) {
      console.error('Error starting screen share:', error);
      throw error;
    }
  }

  stopScreenShare(): void {
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }
  }

  private setupDataChannel(): void {
    if (!this.dataChannel) return;

    this.dataChannel.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (this.onControlSignal) {
          this.onControlSignal(data);
        }
      } catch (error) {
        console.error('Error parsing data channel message:', error);
      }
    };

    this.dataChannel.onopen = () => {
      console.log('Data channel opened');
    };

    this.dataChannel.onclose = () => {
      console.log('Data channel closed');
    };
  }

  setOnRemoteStream(callback: (stream: MediaStream) => void): void {
    this.onRemoteStream = callback;
  }

  setOnControlSignal(callback: (data: any) => void): void {
    this.onControlSignal = callback;
  }

  sendControlSignal(data: any): void {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      this.dataChannel.send(JSON.stringify(data));
    }
  }

  async createOffer(): Promise<RTCSessionDescriptionInit | null> {
    if (!this.peerConnection) return null;

    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);
    return offer;
  }

  async createAnswer(): Promise<RTCSessionDescriptionInit | null> {
    if (!this.peerConnection) return null;

    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);
    return answer;
  }

  async setRemoteDescription(description: RTCSessionDescriptionInit): Promise<void> {
    if (this.peerConnection) {
      await this.peerConnection.setRemoteDescription(description);
    }
  }

  async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (this.peerConnection) {
      await this.peerConnection.addIceCandidate(candidate);
    }
  }

  close(): void {
    this.stopScreenShare();

    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
  }
}
