from abc import ABC, abstractmethod


class BaseEventLogger(ABC):
    """
    Interface for storing research events.

    A future Elasticsearch implementation can follow this same interface.
    """

    @abstractmethod
    def log_search(self, event: dict) -> None:
        pass

    @abstractmethod
    def log_click(self, event: dict) -> None:
        pass

    @abstractmethod
    def log_return(self, event: dict) -> None:
        pass

    @abstractmethod
    def log_chat(self, event: dict) -> None:
        pass

    @abstractmethod
    def get_all_events(self) -> dict:
        pass
