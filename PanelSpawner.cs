public class PanelSpawner : MonoBehaviour
{
    public GameObject panelPrefab;

    private void OnSketchButtonPressed()
    {
        SpawnPanel(Vector3.right);
        SpawnPanel(Vector3.up);
        SpawnPanel(Vector3.forward);
    }

    private void SpawnPanel(Vector3 direction)
    {
        GameObject panel = Instantiate(panelPrefab, transform.position + direction, Quaternion.LookRotation(-direction));
        // Add any additional setup for the panel here
    }
}
