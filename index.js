require([
  "esri/Map",
  "esri/Basemap",
  "esri/views/MapView",
  "esri/layers/FeatureLayer",
  "esri/widgets/Legend",
  "esri/widgets/Expand",
  "esri/widgets/FeatureTable",
  "esri/core/reactiveUtils",
], (
  Map,
  Basemap,
  MapView,
  FeatureLayer,
  Legend,
  Expand,
  FeatureTable,
  reactiveUtils
) => {
  const usCitiesLayer = new FeatureLayer({
    portalItem: {
      id: "7a301e848a7c4bfcaefdac4fe98a7f99",
    },
    outFields: ["*"],
  });

  const basemap = new Basemap({
    portalItem: {
      id: "00c8181753cd4673810a1ede1f52a922",
    },
  });

  const map = new Map({
    basemap: basemap,
    layers: [usCitiesLayer],
  });

  const view = new MapView({
    container: "viewDiv",
    map: map,
    center: [-98.5795, 39.8282],
    zoom: 3,
  });

  const legend = new Legend({ view: view });
  const legendExpand = new Expand({
    expandTooltip: "Show Legend",
    expanded: false,
    view: view,
    content: legend,
  });

  view.ui.add(legendExpand, "top-right");

  view.whenLayerView(usCitiesLayer).then(() => {
    const featureTable = new FeatureTable({
      view: view,
      layer: usCitiesLayer,
      container: "tableDiv",
      menuConfig: {
        items: [createViewRelatedFeaturesMenuItem(usCitiesLayer)],
      },
    });

    reactiveUtils.watch(
      () => featureTable.layer,
      (newLayer) => {
        featureTable.menuConfig = {
          items: [createViewRelatedFeaturesMenuItem(newLayer)],
        };
      }
    );

    function createViewRelatedFeaturesMenuItem(layer) {
      return {
        label: "View Related Features",
        iconClass: "esri-icon-attachment",
        open: true,
        items: layer.relationships.map((relationship) => ({
          label: relationship.name,
          clickFunction: async () => {
            // Get the object IDs of selected rows from the Feature Table widget
            const selectedObjectIds = featureTable.grid.selectedItems.map(
              (item) => item.objectId
            );

            // Query the related features
            const relatedFeatureset = await layer.queryRelatedFeatures({
              objectIds: selectedObjectIds.items,
              relationshipId: relationship.id,
              outFields: ["*"],
            });

            // queryRelatedFeatures function returns an object with the object ID as keys and result FeatureSet as values.
            // Example:
            // relatedFeatureset = {
            //   1: {...}, // FeatureSet of objectId 1
            //   2: {...}, // FeatureSet of objectId 2
            // }

            // To flatten relatedFeatureset into an array of features
            const relatedFeatures = [];
            for (const key in relatedFeatureset) {
              relatedFeatures.push(...relatedFeatureset[key].features);
            }

            // Initialise a new FeatureLayer based on the related table
            const relatedLayer = new FeatureLayer({
              url: `${usCitiesLayer.url}/${relationship.relatedTableId}`,
              outFields: ["*"],
            });
            await relatedLayer.load();

            // Reassign the existing layer of FeatureTable
            featureTable.layer = relatedLayer;

            // To associate the relatedFeatures with relatedLayer for featureTable filtering later
            relatedFeatures.forEach((feature) => {
              feature.sourceLayer = relatedLayer;
            });

            // Filter featureTable
            featureTable.clearSelection();
            featureTable.selectRows(relatedFeatures);
            featureTable.filterBySelection();
            featureTable.clearSelection();
          },
        })),
      };
    }
  });
});
