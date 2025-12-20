"""
RecallBricks Python SDK - Setup
"""

from setuptools import setup, find_packages

with open("README.md", "r", encoding="utf-8") as fh:
    long_description = fh.read()

setup(
    name="recallbricks",
    version="0.1.0",
    author="RecallBricks",
    author_email="support@recallbricks.com",
    description="Universal cognitive runtime for AI systems - persistent identity, continuous memory, and self-improving intelligence",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/recallbricks/agent-runtime",
    packages=find_packages(),
    classifiers=[
        "Development Status :: 3 - Alpha",
        "Intended Audience :: Developers",
        "Topic :: Software Development :: Libraries :: Python Modules",
        "Topic :: Scientific/Engineering :: Artificial Intelligence",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
    ],
    python_requires=">=3.8",
    install_requires=[
        "requests>=2.31.0",
    ],
    extras_require={
        "dev": [
            "pytest>=7.0.0",
            "pytest-cov>=4.0.0",
            "black>=23.0.0",
            "mypy>=1.0.0",
            "ruff>=0.1.0",
        ],
    },
    keywords="ai agent memory cognitive llm runtime anthropic openai persistent-identity",
    project_urls={
        "Bug Reports": "https://github.com/recallbricks/agent-runtime/issues",
        "Source": "https://github.com/recallbricks/agent-runtime",
        "Documentation": "https://github.com/recallbricks/agent-runtime/tree/main/docs",
    },
)
