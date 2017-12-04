/**
 * Created by Tamer on 21/11/2017.
 */
import ActiveExecutionStatus from './ActiveExecutionStatus';

/**
 * @class List
 * @extends {Component}
 */
export default class PluginsCatalogList extends React.Component {
  /**
   * Creates an instance of List.
   * @param {any} props 
   * @param {any} context 
   */
  constructor(props, context) {
    super(props, context);
    this.state = {
      showModal: false,
      deployment: {},
      workflow: {},
      selectedAction: null
    };
  }

  fetchData(fetchParams) {
    return this.props.toolbox.refresh(fetchParams);
  }

  /*
  |--------------------------------------------------------------------------
  | Custom Events
  |--------------------------------------------------------------------------
  */

  /**
   * Modal Events
   */
  showModal() {
    this.setState({ showModal: true });
  }
  hideModal() {
    this.setState({ showModal: false });
    this.props.toolbox.refresh();
  }

  _selectDeployment(item) {
    const template = this.props.widget.configuration.template
    this.props.toolbox.drillDown(this.props.widget, template, { deploymentId: item.id }, item.id);
  }

  _cancelExecution(execution, action) {
    let actions = new Stage.Common.ExecutionActions(this.props.toolbox);
    actions.doCancel(execution, action).then(() => {
      this.setState({ error: null });
      this.props.toolbox.getEventBus().trigger('deployments:refresh');
      this.props.toolbox.getEventBus().trigger('executions:refresh');
    }).catch((err) => {
      this.setState({ error: err.message });
    });
  }

  /**
   * Upload Click Event
   */
  runExecution(name, deployment) {
    let workflow = _.find(deployment.workflows, { name });
    if (!workflow) {
      this.setState({ error: `the ${name} workflow is not allowed` });
      return
    }
    console.log('selected workflow ' + name, workflow);
    this.setState({
      showModal: true,
      deployment,
      workflow
    })
  }

  _errorMessage(msg) {
    const {Message} = Stage.Basic;
    return <Message positive><Message.Header>{msg}</Message.Header></Message>
  }

  _getCustomData(columns, key, item) {
    let source = _.get(columns, key);
    if (!source) {
      return '--';
    }
    let data = this._parseTemplate(source, item);//_.get(item, source);
    if (!data) {
      return '--'
    }
    return data;
  }

  _parseTemplate(tpl, item) {
    const regex = /([^-+/*]+)|([-+/*]+)/g;

    tpl = tpl.trim();
    if (isNaN(tpl)) {
      // check for operators and reparse each element
      if (['-', '+', '*', '/'].some(i => tpl.includes(i))) {
        let final = 0;
        let last = null;
        let m;
        while ((m = regex.exec(tpl)) !== null) {
          let i = m[0];
          if (['-', '+', '*', '/'].includes(i)) {
            last = i;
          } else {
            if (last === '-') {
              final -= this._parseTemplate(i, item);
            } else if (last === '+') {
              final += this._parseTemplate(i, item);
            } else if (last === '*') {
              final *= this._parseTemplate(i, item);
            } else if (last === '/') {
              final /= this._parseTemplate(i, item);
            } else {
              final = this._parseTemplate(i, item);
            }
          };
        }
        
        tpl = final;
      } else {
        tpl = _.get(item, tpl);
      }
    }
    if (!isNaN(tpl)) { // another if coz we need to check again for the getters value
      tpl = Number(tpl);
    }
    return tpl;
  }

  _parseCondition(condition, item) {
    if (_.isEmpty(condition)) {
      return true;
    }

    const regex = /(.*)\((.*)\)/g;
    const m = regex.exec(condition);
    const func = m[1].trim();
    const params = m[2].split(',').map(p => this._parseTemplate(p, item));

    if(func === 'exist'){
      return !_.isEmpty(params[0]);
    }
    if(func === 'empty'){
      return _.isEmpty(params[0]);
    }
    if (func === 'equal') {
      return params[0] === params[1];
    }
    if (func === 'lg') {
      return params[0] > params[1];
    }
    if (func === 'lge') {
      return params[0] >= params[1];
    }
    if (func === 'lt') {
      return params[0] < params[1];
    }
    if (func === 'lte') {
      return params[0] <= params[1];
    }
    if (func === 'between') {
      return params[1] <= params[0] && params[0] <= params[2];
    }

    return true;
    
    // exist(arg1)
    // equal(arg1, arg2)
    // lg(arg1, arg2)
    // lt(arg1, arg2)
    // lge(arg1, arg2)
    // lte(arg1, arg2)
    // count(arg1, arg2)
    // between(arg1, arg2, arg3)
    // equal(totalCPU-usedCPU, value)
    // 
    // TODO: order by columns
    // TODO: custom filter for columns


  }

  /*
  |--------------------------------------------------------------------------
  | React Renderer
  |--------------------------------------------------------------------------
  */
  render() {
    const {DataTable, PrivateMarker, Button, ErrorMessage} = Stage.Basic;
    const {ExecuteDeploymentModal} = Stage.Common;
    const tableName = 'deploymentsTable';
    // const columnsToShow = this.props.widget.configuration.columnsToShow;
    let columns = this.props.widget.configuration.columns;
    columns = _.chain(columns).filter((item) => !_.isEmpty(item.source)).value();

    let buttons = this.props.widget.configuration.buttons;
    buttons = _.chain(buttons).filter((item) => !_.isEmpty(item.workflow)).value();

    
    // console.log('this.props', this.props)
    // console.log('columns', columns)
    // console.log('buttons', buttons)

    return <div>
      <ErrorMessage error={this.state.error} onDismiss={() => this.setState({ error: null })} autoHide={true} />

      <DataTable fetchData={this.fetchData.bind(this)}
        totalSize={this.props.data.total}
        pageSize={this.props.widget.configuration.pageSize}
        sortColumn={this.props.widget.configuration.sortColumn}
        sortAscending={this.props.widget.configuration.sortAscending}
        selectable={true}
        className={tableName}>

        <DataTable.Column label="Name" name="id" width="25%" />
        <DataTable.Column label={_.get(columns, '0.label')} show={!!_.get(columns, '0.label', )} />
        <DataTable.Column label={_.get(columns, '1.label')} show={!!_.get(columns, '1.label', )} />
        <DataTable.Column label={_.get(columns, '2.label')} show={!!_.get(columns, '2.label', )} />
        <DataTable.Column label={_.get(columns, '3.label')} show={!!_.get(columns, '3.label', )} />
        <DataTable.Column label={_.get(columns, '4.label')} show={!!_.get(columns, '4.label', )} />
        <DataTable.Column label={_.get(columns, '5.label')} show={!!_.get(columns, '5.label', )} />
        <DataTable.Column label={_.get(columns, '6.label')} show={!!_.get(columns, '6.label', )} />
        <DataTable.Column label={_.get(columns, '7.label')} show={!!_.get(columns, '7.label', )} />
        <DataTable.Column label={_.get(columns, '8.label')} show={!!_.get(columns, '8.label', )} />
        <DataTable.Column label={_.get(columns, '9.label')} show={!!_.get(columns, '9.label', )} />
        <DataTable.Column label="Actions" width="20%" show={buttons.length} />

        {
          this.props.data.items.map((item) => {
            
            return (

              <DataTable.Row id={`${tableName}_${item.id}`} key={item.id} selected={item.isSelected}>
                <DataTable.Data>
                  <a className='deploymentName' href="javascript:void(0)" onClick={() => this._selectDeployment(item)}>{item.id}</a>
                  <PrivateMarker availability={item.resource_availability} title="Private resource" />
                </DataTable.Data>
                <DataTable.Data>{this._getCustomData(columns, '0.source', item)}</DataTable.Data>
                <DataTable.Data>{this._getCustomData(columns, '1.source', item)}</DataTable.Data>
                <DataTable.Data>{this._getCustomData(columns, '2.source', item)}</DataTable.Data>
                <DataTable.Data>{this._getCustomData(columns, '3.source', item)}</DataTable.Data>
                <DataTable.Data>{this._getCustomData(columns, '4.source', item)}</DataTable.Data>
                <DataTable.Data>{this._getCustomData(columns, '5.source', item)}</DataTable.Data>
                <DataTable.Data>{this._getCustomData(columns, '6.source', item)}</DataTable.Data>
                <DataTable.Data>{this._getCustomData(columns, '7.source', item)}</DataTable.Data>
                <DataTable.Data>{this._getCustomData(columns, '8.source', item)}</DataTable.Data>
                <DataTable.Data>{this._getCustomData(columns, '9.source', item)}</DataTable.Data>
                <DataTable.Data className="center aligned rowActions">
                  {
                    _.isEmpty(item.executions)
                      ?
                      <div>
                        {buttons.map(button => this._parseCondition(button.condition, item) && <Button
                          color={button.color}
                          size='mini'
                          onClick={this.runExecution.bind(this, button.workflow, item)}
                          >{button.label}</Button>)}
                      </div>
                      :
                      <ActiveExecutionStatus item={item.executions[0]} onCancelExecution={this._cancelExecution.bind(this)} />
                  }
                </DataTable.Data>
              </DataTable.Row>
            );
          })
        }
      </DataTable>


      <ExecuteDeploymentModal
        open={this.state.showModal}
        deployment={this.state.deployment}
        workflow={this.state.workflow}
        onHide={this.hideModal.bind(this)}
        toolbox={this.props.toolbox} />
    </div>;
  }
}
