public class CameraController : MonoBehaviour
{
    public float moveSpeed = 5f;

    private void OnSurfaceSelected(Vector3 surfaceNormal)
    {
        Vector3 targetPosition = transform.position + surfaceNormal * 5f; // Adjust the distance as needed
        Quaternion targetRotation = Quaternion.LookRotation(-surfaceNormal);

        // Use a coroutine to smoothly move the camera
        StartCoroutine(MoveCamera(targetPosition, targetRotation));
    }

    private IEnumerator MoveCamera(Vector3 targetPosition, Quaternion targetRotation)
    {
        while (transform.position != targetPosition || transform.rotation != targetRotation)
        {
            transform.position = Vector3.MoveTowards(transform.position, targetPosition, moveSpeed * Time.deltaTime);
            transform.rotation = Quaternion.Slerp(transform.rotation, targetRotation, moveSpeed * Time.deltaTime);
            yield return null;
        }
    }
}
