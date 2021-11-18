import { connect } from 'datocms-plugins-sdk';
import { render } from './utils/render';
import ConfigScreen from './entrypoints/ConfigScreen';
import 'datocms-react-ui/styles.css';

connect({
  renderConfigScreen(ctx) {
    return render(<ConfigScreen ctx={ctx} />);
  },
});
