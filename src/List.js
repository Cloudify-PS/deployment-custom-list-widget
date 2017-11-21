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
  /*
  |--------------------------------------------------------------------------
  | React Renderer
  |--------------------------------------------------------------------------
  */
  render() {
    const {DataTable, PrivateMarker, Button, ErrorMessage} = Stage.Basic;
    const {ExecuteDeploymentModal} = Stage.Common;
    const tableName = 'deploymentsTable';
    const columns = this.props.widget.configuration.columnsToShow;
    console.log('this.props', this.props)
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
        {columns.includes('Blueprint') && <DataTable.Column label="Blueprint" name="blueprint_id" />}
        {columns.includes('Created') && <DataTable.Column label="Created" name="created_at" />}
        {columns.includes('Updated') && <DataTable.Column label="Updated" name="updated_at" />}
        {columns.includes('Creator') && <DataTable.Column label="Creator" name='created_by' />}
        <DataTable.Column width="20%" />

        {
          this.props.data.items.map((item) => {

            return (

              <DataTable.Row id={`${tableName}_${item.id}`} key={item.id} selected={item.isSelected}>
                <DataTable.Data>
                  <a className='deploymentName' href="javascript:void(0)" onClick={() => this._selectDeployment(item)}>{item.id}</a>
                  <PrivateMarker availability={item.resource_availability} title="Private resource" />
                </DataTable.Data>
                <DataTable.Data className={!columns.includes('Blueprint')?'none':''}>{item.blueprint_id}</DataTable.Data>
                <DataTable.Data className={!columns.includes('Created')?'none':''}>{item.created_at}</DataTable.Data>
                <DataTable.Data className={!columns.includes('Updated')?'none':''}>{item.updated_at}</DataTable.Data>
                <DataTable.Data className={!columns.includes('Creator')?'none':''}>{item.created_by}</DataTable.Data>
                <DataTable.Data className="center aligned rowActions">
                  {
                    _.isEmpty(item.executions)
                      ?
                      <div>
                        <Button
                          primary
                          size='mini'
                          onClick={this.runExecution.bind(this, 'install', item)}
                          >Approve</Button>
                        <Button
                          size='mini'
                          color='red'
                          onClick={this.runExecution.bind(this, 'uninstall', item)}
                          >Deny</Button>
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
