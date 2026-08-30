using UnityEngine;

public class WrongName : MonoBehaviour
{
    void Update()
    {
        var cam = Camera.main;
        GameObject.Find("Player");
        Debug.Log(cam);
    }

    void LateUpdate()
    {
    }
}
