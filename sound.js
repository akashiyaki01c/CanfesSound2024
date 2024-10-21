class Mp3Object {
	key = "";
	filePath = "";
	text = "";
	#mp3Data = new ArrayBuffer(0);
	/**	@type {AudioBufferSourceNode} */
	#source = null;
	/** @type {HTMLElement} */
	#parent = null;
	/** @type {HTMLElement} */
	#element = null;
	/** @type {GainNode} */
	#gain = null;

	constructor(key, filePath, insertElementQuery, text) {
		this.key = key;
		this.filePath = filePath;
		this.#parent = document.querySelector(insertElementQuery);
		
		this.#element = document.createElement('div');
		this.#parent.appendChild(this.#element);

		this.text = text;
		this.#element.innerHTML = `
		<div><button>${text}</button></div>
		<div><input type="range" min="0" max="1" step="0.01" value="1"></div>
		`;
		this.#element.querySelector("button").disabled = true;
		this.#element.querySelector("button").addEventListener('click', async e => {
			const isPlaying = this.#element.dataset.playing === "true";
			if (isPlaying) {
				this.stop();
			} else {
				this.play();
			}
		});
		this.#element.querySelector("input").addEventListener('input', e => {
			console.log(e.target.value);
			if (this.#gain != null)
				this.#gain.gain.value = parseFloat(e.target.value, 10);
		});
	}

	async #getMp3ArrayBuffer() {
		const mp3File = await (await fetch(this.filePath)).arrayBuffer();
		return mp3File;
	}
	async #getAudioBufferSource() {
		const context = new AudioContext();
		const gain = context.createGain();
		const source = context.createBufferSource();
		await context.decodeAudioData(this.#mp3Data.slice(0), (buf) => {
			source.buffer = buf;
		});
		source.connect(gain);
		gain.connect(context.destination);
		this.#gain = gain;
		source.addEventListener('ended', async () => {
			this.#source = await this.#getAudioBufferSource();
			this.#element.dataset.playing = "false";
		});
		return source;
	}

	async init() {
		this.#mp3Data = await this.#getMp3ArrayBuffer();
		const source = await this.#getAudioBufferSource();
		this.#source = source;
		this.#element.querySelector("button").disabled = false;
	}

	async play() {
		this.#source.start();
		this.#element.dataset.playing = "true";
	}
	async stop() {
		this.#element.querySelector("button").disabled = true;
		this.#element.dataset.playing = "false";
		this.#source.stop();
		this.#source = await this.#getAudioBufferSource();
		this.#element.querySelector("button").disabled = false;
	}
}

const mp3Objects = [];

const txt = await (await fetch("settings.tsv")).text();
const csvCells = txt.split("\n").map(v => v.split("\t").map(v => v.trim()));
for (const cells of csvCells) {
	const obj = new Mp3Object(
		cells[0],
		cells[1],
		"main",
		cells[2]
	);
	obj.init();
	mp3Objects.push(obj);
}