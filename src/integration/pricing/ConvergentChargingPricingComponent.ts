import Utils from '../../utils/Utils';

const ConvergentChargingPricingComponent = Utils.isModuleAvailable(__dirname + '/convergent-charging/ConvergentChargingPricing') ?
  require('./convergent-charging/ConvergentChargingPricing').default :
  require('../../utils/DummyModule').default;

export default ConvergentChargingPricingComponent;
