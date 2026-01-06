import secrets
import string

def random_string(length: int = 200) -> str:
    """
    Tạo một chuỗi ngẫu nhiên có độ dài `length` ký tự.
    Sử dụng `secrets.choice` để đảm bảo độ ngẫu nhiên cao (cryptographically secure).
    """
    
    alphabet = (
        string.ascii_uppercase +   # A-Z
        string.ascii_lowercase +   # a-z
        string.digits +            # 0-9
        "!@#$%^&*()-_=+[]{}|;:'\",.<>?/"  # các ký hiệu
    )

    
    return ''.join(secrets.choice(alphabet) for _ in range(length))
print ("you Password here:")

if __name__ == "__main__":
    # In ra một chuỗi ngẫu nhiên 200 ký tự
    print(random_string(72))

