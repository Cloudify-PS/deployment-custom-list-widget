/**
 * Created by Tamer on 21/11/2017.
 */

import List from './List'

Stage.defineWidget({
  id: 'list-visualization',
  name: 'List Visualization',
  description: 'List Visualization Widget',
  initialWidth: 12,
  initialHeight: 16,
  color: 'purple',
  hasStyle: true,
  isReact: true,

  permission: Stage.GenericConfig.CUSTOM_WIDGET_PERMISSIONS.CUSTOM_ALL,
  categories: [Stage.GenericConfig.CATEGORY.SYSTEM_RESOURCES],

  initialConfiguration: [
    Stage.GenericConfig.POLLING_TIME_CONFIG(5),
    Stage.GenericConfig.PAGE_SIZE_CONFIG(),
    {
      id: 'blueprintIdFilter',
      name: 'Blueprint ID to filter by',
      placeHolder: 'Enter the blueprint id you wish to filter by',
      type: Stage.Basic.GenericField.STRING_TYPE
    },
    {
      id: 'columnsToShow',
      name: 'List of Columns to show in the table',
      placeHolder: 'Select Column from the list',
      items: ['Blueprint', 'Created', 'Updated', 'Creator'],
      default: 'Blueprint,Created,Updated,Creator',
      type: Stage.Basic.GenericField.MULTI_SELECT_LIST_TYPE
    },
    {
      id: 'template',
      name: 'Template to Redirect on click',
      default: 'deployment',
      placeHolder: 'Enter Template Name you want to redirect to',
      type: Stage.Basic.GenericField.STRING_TYPE
    },
  ],

  fetchParams: function (widget, toolbox) {
    var blueprintId = toolbox.getContext().getValue('blueprintId');

    blueprintId = _.isEmpty(widget.configuration.blueprintIdFilter) ? blueprintId : widget.configuration.blueprintIdFilter;

    let obj = {
      blueprint_id: blueprintId
    }
    if (toolbox.getContext().getValue('onlyMyResources')) {
      obj.created_by = toolbox.getManager().getCurrentUsername();
    }
    return obj;
  },

  fetchData(widget, toolbox, params) {
    const deployments = toolbox.getManager().doGet('/deployments', params);

    var deploymentIds = deployments.then(data => Promise.resolve([...new Set(data.items.map(item => item.id))]));

    let executionsData = deploymentIds.then(ids => {
      return toolbox.getManager().doGet('/executions?_include=id,workflow_id,status,deployment_id',
        { deployment_id: ids, status: ['pending', 'started', 'cancelling', 'force_cancelling'] });
    });

    return Promise.all([deployments, executionsData]).then(data => {
      let deploymentData = data[0];
      let executionsData = _.groupBy(data[1].items, 'deployment_id');

      let formattedData = Object.assign({}, deploymentData, {
        items: _.map(deploymentData.items, (item) => {
          return Object.assign({}, item, {
            executions: executionsData[item.id],
            column1: 'additional test col'
          })
        })
      });
      formattedData.total = _.get(deploymentData, 'metadata.pagination.total', 0);

      return Promise.resolve(formattedData);
    })
  },

  render: function (widget, data, error, toolbox) {

    if (_.isEmpty(data)) {
      return <Stage.Basic.Loading />;
    }

    let selectedDeployment = toolbox.getContext().getValue('deploymentId');
    let formattedData = Object.assign({}, data, {
      items: _.map(data.items, (item) => {
        return Object.assign({}, item, {
          isSelected: selectedDeployment === item.id
        })
      })
    });


    return (
      <List
        widget={widget}
        data={formattedData}
        toolbox={toolbox}
        />
    );
  }
});