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
	return (<VirtualList rowHeight={30} overscanCount={10} data={history} renderRow={(r) =>(<div style="min-height: 30px; border-bottom: 1px solid #00f; padding: 5px;">{r.raw}</div>)} />);
};

async function main () {
	const tws = new Tws();
	await tws.connect();
	console.log("connected");
	await tws.join("#germandota");
	window.tws = tws;
	const db = new Dexie('log');
	db.version(1).stores({
		raw: '++id,text'
	});
	const history = [];
	const { setState, StateComponent } = externalProvider({ history });
	tws.on('receive', (r) => {
		if (!r.success) return console.error(e);
		history.push(r.result);
		setState({ history });
		const { raw: text, ...meta } = r.result;
		db.raw.add({
			text,
			meta
		});
	});

	render(<StateComponent Child={RenderableList} />, document.body);
}

document.addEventListener('readystatechange', () => {
	if (document.readyState == 'interactive') {
		main().then(console.log, console.error);
	}
});