import { h, render, Component } from "preact";
import Tws from "../../dist/browser.esnext.mjs";
import Dexie from "dexie";
import VirtualList from "preact-virtual-list";

const externalProvider = (oState) => {
	const instances = [];
	const lastState = { state: oState };
	class StateComponent extends Component {
		constructor() {
			super();
			this.state = oState;
		}
		render({ children }, state) {
			console.log(state);
			return h(this.props.Child, { ...state });
		}

		componentWillMount() {
			this.index = instances.push(this);
			this.setState(lastState.state);
		}

		componentWillUnmount() {
			lastState.splice(this.index, 1);
		}
	}
	return {
		StateComponent,
		setState: (s) => {
			lastState.state = s;
			instances.forEach(r => r.setState(s));
		}
	};
}

const RenderableList = ({ history }) => {
	return (<VirtualList rowHeight={50} overscanCount={10} data={history} renderRow={(r) =>(<div style={`min-height: 30px; border-bottom: 1px solid ${r.type == 0 ? '#f00' : '#00f'}; padding: 5px; `}>{r.raw}</div>)} />);
};

async function main () {
	const tws = new Tws();
	window.tws = tws;
	const db = new Dexie('log');
	db.version(2).stores({
		raw: '++id,text,type,date'
	});
	const history = [];
	const { setState, StateComponent } = externalProvider({ history });
	tws.on('raw-send', (r) => {
		db.raw.add({
			text: r.message,
			type: "outgoing",
			date: (new Date()).toJSON()
		});
		history.push({
			date: new Date(),
			raw: r.message,
			type: 0
		})
	});
	tws.on('receive', (r) => {
		if (!r.success) return console.error(e);
		history.push({ type: 1, ...r.message});
		setState({ history });
		const { raw: text, ...meta } = r.message;
		db.raw.add({
			text,
			meta,
			type: "incomming",
			date: (new Date()).toJSON()
		});
	});
	await tws.connect();
	console.log("connected");
	await tws.join("#germandota");

	render(<StateComponent Child={RenderableList} />, document.body);
}

document.addEventListener('readystatechange', () => {
	if (document.readyState == 'interactive') {
		main().then(console.log, console.error);
	}
});