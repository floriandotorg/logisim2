import _ from 'lodash';
import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { toBinaryString } from '../logic/util';

const DIPSwitchRenderer = ({ params: [ instance, name ] }) => {
  const [value, setValue] = useState(0n);

  const onChange = n => event => {
    const newValue = event.target.checked ? value | (1n << BigInt(n)) : value & ~ (1n << BigInt(n));
    instance.set(newValue);
    setValue(newValue);
  }

  return <div className="widget">
    <h2>{name}</h2>
    {_.rangeRight(instance.width()).map(n => <input key={n} type="checkbox" onChange={onChange(n)} checked={value & (1n << BigInt(n))} />)}
  </div>;
}

const LEDArrayRenderer = ({ params: [ instance, name ] }) => {
  const [value, setValue] = useState(0n);
  const [width, setWidth] = useState(0);

  instance.onValueChange((v, w) => {
    setValue(v);
    setWidth(w);
  });

  return <div className="widget">
    <h2>{name}</h2>
    <p>{toBinaryString(value, width)}</p>
  </div>;
}

const mapComponentToRenderer = {
  'LEDArray': LEDArrayRenderer,
  'DIPSwitch': DIPSwitchRenderer,
}

export default (layout) => {
  const App = () => <div>
    {layout.map(widget => {
      const Element = mapComponentToRenderer[widget[0].constructor.name];
      return <Element className="row" key={widget[1]} params={widget} />;
    })}
  </div>

  ReactDOM.render(<App />, document.getElementById('app'));
}
