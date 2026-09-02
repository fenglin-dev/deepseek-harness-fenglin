/** Minimal native-image double; real Electron decoding is covered by icon-native-smoke.mjs. */
export class TestIconImage {
  constructor(readonly width: number, readonly height: number, readonly color = 1, private readonly bitmap?: Buffer) {}
  getSize(): { width: number; height: number } { return { width: this.width, height: this.height } }
  isEmpty(): boolean { return false }
  resize(options: { width: number; height: number }): TestIconImage { return new TestIconImage(options.width, options.height, this.color) }
  crop(options: { width: number; height: number }): TestIconImage { return this.resize(options) }
  toBitmap(): Buffer {
    if (this.bitmap !== undefined) return Buffer.from(this.bitmap)
    const bytes = Buffer.alloc(this.width * this.height * 4)
    for (let i = 0; i < bytes.length; i += 4) { bytes[i] = this.color; bytes[i + 3] = 255 }
    return bytes
  }
  toPNG(): Buffer {
    const bytes = Buffer.alloc(34)
    Buffer.from('89504e470d0a1a0a', 'hex').copy(bytes)
    bytes.writeUInt32BE(13, 8); bytes.write('IHDR', 12)
    bytes.writeUInt32BE(this.width, 16); bytes.writeUInt32BE(this.height, 20)
    bytes[33] = this.color
    return bytes
  }
  toDataURL(): string { return `data:image/png;base64,${this.toPNG().toString('base64')}` }
}

export const testNativeImage = {
  createFromBitmap: (bytes: Buffer, options: { width: number; height: number }): TestIconImage => {
    const center = (Math.floor(options.height / 2) * options.width + Math.floor(options.width / 2)) * 4
    return new TestIconImage(options.width, options.height, bytes[center], Buffer.from(bytes))
  },
  createFromBuffer: (bytes: Buffer): TestIconImage => new TestIconImage(bytes.readUInt32BE(16), bytes.readUInt32BE(20), bytes[33]),
}
