import * as React from 'react'
import { DispatchProps, State, State as Props } from './types'

const { connect } = require('react-redux')
import { bindActionCreators, Dispatch } from 'redux'

import { sendEca, setAmount, setToAddress } from './actions'

// tslint:disable-next-line:typedef
const mapStateToProps  = (state: State): Props =>
({
  payments: state.payments
})

// tslint:disable-next-line:typedef
const mapDispatchToProps = (dispatch: Dispatch<{}>): DispatchProps =>
  bindActionCreators({
    sendEca,
    setAmount,
    setToAddress
// tslint:disable-next-line:align
}, dispatch)

@connect(mapStateToProps, mapDispatchToProps)
export default class Payments extends React.Component<Props & DispatchProps, any> {
  onClick = (): void => {
    this.props.sendEca()
  }

  setAmount = (event: any): void  => {
    const { value } = event.target
    this.props.setAmount(value)
  }

  setToAddress = (event: any): void  => {
    const { value } = event.target
    this.props.setToAddress(value)
  }

  public render(): any {
    return (
      <div>
        Payments
        <input type='text' placeholder='Address to send' onChange={this.setToAddress} />
        <input type='text' placeholder='Amount' onChange={this.setAmount} />
        <button onClick={this.onClick}>Send</button>
      </div>
    )
  }
}
