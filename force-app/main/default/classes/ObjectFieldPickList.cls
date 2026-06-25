global class ObjectFieldPickList extends VisualEditor.DynamicPickList {

    private VisualEditor.DynamicPickListRows rows;

    global ObjectFieldPickList(VisualEditor.DesignTimePageContext context) {
        this.rows = buildRows(context.pageType, context.entityName);
    }

    private VisualEditor.DynamicPickListRows buildRows(String pageType, String objectName) {
        VisualEditor.DynamicPickListRows rows = new VisualEditor.DynamicPickListRows();
        if (pageType == 'RecordPage' && objectName != null) {
            Map<String, Schema.SObjectField> fields =
                Schema.describeSObjects(new List<String>{ objectName })[0].fields.getMap();
            for (String fieldName : fields.keySet()) {
                Schema.DescribeFieldResult f = fields.get(fieldName).getDescribe();
                rows.addRow(new VisualEditor.DataRow(
                    f.getLabel(),
                    objectName + '.' + f.getName()
                ));
            }
        }
        return rows;
    }

    global override VisualEditor.DataRow getDefaultValue() {
        return null;
    }

    global override VisualEditor.DynamicPickListRows getValues() {
        return this.rows;
    }
}
