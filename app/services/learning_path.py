"""
Learning Path Generation Service using LangChain
"""
import json
import random
import string
from datetime import datetime, timedelta
from typing import Dict, List
from langchain_openai import OpenAI
from langchain_core.prompts import PromptTemplate
from langchain.chains import LLMChain

from app.config import get_settings, get_llm_config
from app.models.schemas import (
    UserProfile, LearningPathResponse, LearningPath, LearningPhase,
    LearningResource, LearningProject, LearningMilestone, EstimatedTime,
    PopularPathsResponse, PopularPath, ProgressUpdateResponse
)


class LearningPathService:
    """Service for generating personalized learning paths"""
    
    def __init__(self):
        self.settings = get_settings()
        self.llm = None
        self.knowledge_base = self._initialize_knowledge_base()
        self._initialize_llm()
    
    def _initialize_llm(self):
        """Initialize the LLM for learning path generation"""
        llm_config = get_llm_config()
        
        try:
            if llm_config["provider"] == "openai":
                self.llm = OpenAI(
                    openai_api_key=llm_config["api_key"],
                    model_name="gpt-3.5-turbo-instruct",
                    temperature=0.7,
                    max_tokens=1500
                )
            else:
                print("No OpenAI API key provided. Using mock LLM for demonstration.")
                self.llm = self._create_mock_llm()
                
        except Exception as e:
            print(f"Error initializing LearningPath LLM: {e}")
            print("Falling back to mock LLM.")
            self.llm = self._create_mock_llm()
    
    def _create_mock_llm(self):
        """Create a mock LLM for demonstration"""
        class MockLearningLLM:
            def predict(self, prompt: str) -> str:
                return self._generate_mock_learning_path(prompt)
            
            def _generate_mock_learning_path(self, prompt: str) -> str:
                return """Learning Path for Full-Stack Web Development:

1. Prerequisites
   - Basic computer skills
   - Text editor setup (VS Code recommended)
   - Git and version control basics

2. Core Topics
   - HTML fundamentals (2 weeks)
   - CSS styling and layout (3 weeks)
   - JavaScript basics (4 weeks)
   - DOM manipulation and events (2 weeks)
   - React.js framework (4 weeks)
   - Node.js and Express.js (3 weeks)
   - Database integration (2 weeks)

3. Projects
   - Build a personal portfolio website
   - Create a todo list application with React
   - Develop a full-stack blog application
   - Build a e-commerce website prototype

4. Additional Resources
   - MDN Web Docs for reference
   - React official documentation
   - Node.js official guides
   - Online coding bootcamps

5. Milestones
   - Week 2: Complete basic HTML structure
   - Week 5: Master CSS layouts and responsiveness
   - Week 9: Build interactive JavaScript applications
   - Week 11: Complete first React project
   - Week 18: Deploy full-stack application"""
        
        return MockLearningLLM()
    
    def _initialize_knowledge_base(self) -> Dict:
        """Initialize the knowledge base with skill information"""
        return {
            "skills": {
                "web-development": {
                    "prerequisites": [],
                    "difficulty": "beginner",
                    "estimated_time": "3-6 months",
                    "topics": ["HTML", "CSS", "JavaScript", "React", "Node.js"]
                },
                "machine-learning": {
                    "prerequisites": ["python", "statistics"],
                    "difficulty": "intermediate",
                    "estimated_time": "6-12 months",
                    "topics": ["Python", "NumPy", "Pandas", "Scikit-learn", "TensorFlow"]
                },
                "data-science": {
                    "prerequisites": ["python", "statistics"],
                    "difficulty": "intermediate",
                    "estimated_time": "6-9 months",
                    "topics": ["Python", "SQL", "Statistics", "Data Visualization", "Machine Learning"]
                },
                "mobile-development": {
                    "prerequisites": ["programming-basics"],
                    "difficulty": "intermediate",
                    "estimated_time": "4-8 months",
                    "topics": ["React Native", "Flutter", "iOS/Android", "UI/UX", "API Integration"]
                },
                "devops": {
                    "prerequisites": ["linux", "programming-basics"],
                    "difficulty": "advanced",
                    "estimated_time": "6-12 months",
                    "topics": ["Docker", "Kubernetes", "CI/CD", "AWS/Azure", "Monitoring"]
                }
            },
            "learning_styles": {
                "visual": "Videos, diagrams, and visual tutorials",
                "hands-on": "Projects, coding exercises, and practical applications",
                "theoretical": "Books, documentation, and structured courses",
                "mixed": "Combination of all learning approaches"
            }
        }
    
    def _create_learning_path_prompt(self) -> PromptTemplate:
        """Create the learning path generation prompt"""
        return PromptTemplate(
            template="""You are an AI learning advisor. Create a personalized learning path based on the user's profile.

User Profile:
- Goal: {goal}
- Current Skills: {current_skills}
- Experience Level: {experience}
- Time Commitment: {time_commitment}
- Learning Style: {learning_style}
- Interests: {interests}

Knowledge Base:
{knowledge_base}

Create a structured learning path with the following format:
1. Prerequisites (if any)
2. Core Topics (ordered by learning sequence)
3. Projects/Practical Applications
4. Additional Resources
5. Milestones and Timeline

Make the path realistic, achievable, and tailored to their experience level and time commitment.
Provide specific recommendations for resources, tools, and practical projects.

Learning Path:""",
            input_variables=["goal", "current_skills", "experience", "time_commitment", 
                           "learning_style", "interests", "knowledge_base"]
        )
    
    async def generate_learning_path(self, user_profile: UserProfile) -> LearningPathResponse:
        """Generate a personalized learning path"""
        try:
            if isinstance(self.llm, type(self._create_mock_llm())):
                # Use mock response
                response_text = self.llm.predict("")
            else:
                # Use actual LLM with modern API
                prompt = self._create_learning_path_prompt()
                
                formatted_prompt = prompt.format(
                    goal=user_profile.goal,
                    current_skills=", ".join(user_profile.current_skills),
                    experience=user_profile.experience,
                    time_commitment=user_profile.time_commitment,
                    learning_style=user_profile.learning_style,
                    interests=", ".join(user_profile.interests),
                    knowledge_base=json.dumps(self.knowledge_base, indent=2)
                )
                
                if hasattr(self.llm, 'apredict'):
                    result = await self.llm.apredict(formatted_prompt)
                else:
                    result = self.llm.predict(formatted_prompt)
                response_text = result
            
            # Parse the response into structured data
            learning_path = self._parse_learning_path_response(response_text, user_profile)
            estimated_time = self._calculate_estimated_time(learning_path, user_profile.time_commitment)
            recommendations = self._generate_recommendations(user_profile, learning_path)
            
            return LearningPathResponse(
                user_profile=user_profile,
                learning_path=learning_path,
                estimated_completion_time=estimated_time,
                recommendations=recommendations
            )
            
        except Exception as e:
            raise Exception(f"Learning path generation failed: {str(e)}")
    
    def _parse_learning_path_response(self, response_text: str, user_profile: UserProfile) -> LearningPath:
        """Parse the LLM response into structured learning path data"""
        path_id = self._generate_path_id()
        
        # Extract phases from response
        phases = self._extract_phases(response_text)
        
        # Extract resources, projects, and milestones
        resources = self._extract_resources(response_text)
        projects = self._extract_projects(response_text)
        milestones = self._extract_milestones(response_text)
        
        return LearningPath(
            id=path_id,
            title=f"Learning Path: {user_profile.goal}",
            description=f"Customized learning path for {user_profile.experience} level",
            phases=phases,
            resources=resources,
            projects=projects,
            milestones=milestones,
            created_at=datetime.now().isoformat()
        )
    
    def _extract_phases(self, response_text: str) -> List[LearningPhase]:
        """Extract learning phases from the response"""
        phases = []
        lines = response_text.split('\n')
        current_phase = None
        
        for line in lines:
            line = line.strip()
            if line and (line.startswith(('1.', '2.', '3.', '4.', '5.')) or 'Phase' in line):
                if current_phase:
                    phases.append(current_phase)
                
                current_phase = LearningPhase(
                    title=line.split('.', 1)[-1].strip() if '.' in line else line,
                    topics=[],
                    duration="Varies"
                )
            elif current_phase and line and not line.startswith(('1.', '2.', '3.', '4.', '5.')):
                if line.startswith('-') or line.startswith('•'):
                    current_phase.topics.append(line.lstrip('- •').strip())
                elif '(' in line and ')' in line:
                    # Extract duration if mentioned
                    if 'week' in line.lower() or 'month' in line.lower():
                        current_phase.topics.append(line.strip())
        
        if current_phase:
            phases.append(current_phase)
        
        return phases[:5]  # Limit to 5 phases
    
    def _extract_resources(self, response_text: str) -> List[LearningResource]:
        """Extract learning resources from the response"""
        resources = []
        resource_keywords = ['book', 'course', 'tutorial', 'documentation', 'video', 'guide']
        lines = response_text.split('\n')
        
        for line in lines:
            if any(keyword in line.lower() for keyword in resource_keywords):
                resource_type = self._detect_resource_type(line)
                resources.append(LearningResource(
                    type=resource_type,
                    description=line.strip(),
                    recommended=True
                ))
        
        return resources[:10]  # Limit to 10 resources
    
    def _extract_projects(self, response_text: str) -> List[LearningProject]:
        """Extract learning projects from the response"""
        projects = []
        lines = response_text.split('\n')
        
        for line in lines:
            if 'project' in line.lower() or 'build' in line.lower():
                difficulty = self._assess_project_difficulty(line)
                projects.append(LearningProject(
                    title=line.strip(),
                    difficulty=difficulty,
                    estimated_time="1-2 weeks"
                ))
        
        return projects[:5]  # Limit to 5 projects
    
    def _extract_milestones(self, response_text: str) -> List[LearningMilestone]:
        """Extract learning milestones from the response"""
        milestones = []
        lines = response_text.split('\n')
        
        for i, line in enumerate(lines):
            if 'milestone' in line.lower() or 'week' in line.lower():
                target_date = self._calculate_milestone_date(i)
                milestones.append(LearningMilestone(
                    title=line.strip(),
                    target_date=target_date,
                    completed=False
                ))
        
        return milestones[:8]  # Limit to 8 milestones
    
    def _detect_resource_type(self, line: str) -> str:
        """Detect the type of resource from the line"""
        lower_line = line.lower()
        if 'book' in lower_line:
            return 'book'
        elif 'course' in lower_line:
            return 'course'
        elif 'video' in lower_line:
            return 'video'
        elif 'tutorial' in lower_line:
            return 'tutorial'
        elif 'documentation' in lower_line or 'docs' in lower_line:
            return 'documentation'
        else:
            return 'general'
    
    def _assess_project_difficulty(self, project_description: str) -> str:
        """Assess project difficulty from description"""
        lower_desc = project_description.lower()
        if 'simple' in lower_desc or 'basic' in lower_desc:
            return 'beginner'
        elif 'advanced' in lower_desc or 'complex' in lower_desc:
            return 'advanced'
        else:
            return 'intermediate'
    
    def _calculate_milestone_date(self, index: int) -> str:
        """Calculate milestone target date"""
        date = datetime.now() + timedelta(weeks=(index + 1) * 2)
        return date.strftime('%Y-%m-%d')
    
    def _calculate_estimated_time(self, learning_path: LearningPath, time_commitment: str) -> EstimatedTime:
        """Calculate estimated completion time"""
        # Extract hours per week from time commitment
        try:
            hours_per_week = int(time_commitment.split(' ')[0])
        except:
            hours_per_week = 10
        
        # Estimate total hours based on phases
        total_hours = len(learning_path.phases) * 40  # 40 hours per phase
        estimated_weeks = max(1, total_hours // hours_per_week)
        
        return EstimatedTime(
            total_hours=total_hours,
            estimated_weeks=estimated_weeks,
            time_commitment=time_commitment
        )
    
    def _generate_recommendations(self, user_profile: UserProfile, learning_path: LearningPath) -> List[str]:
        """Generate personalized recommendations"""
        recommendations = []
        
        # Based on experience level
        if user_profile.experience == "beginner":
            recommendations.append("Start with fundamentals and build gradually")
            recommendations.append("Focus on hands-on practice with each concept")
        
        # Based on learning style
        if user_profile.learning_style == "visual":
            recommendations.append("Prioritize video tutorials and visual aids")
        elif user_profile.learning_style == "hands-on":
            recommendations.append("Emphasize project-based learning")
        elif user_profile.learning_style == "theoretical":
            recommendations.append("Focus on comprehensive reading and documentation")
        
        # Based on time commitment
        try:
            hours_per_week = int(user_profile.time_commitment.split(' ')[0])
            if hours_per_week < 10:
                recommendations.append("Consider extending timeline due to limited time commitment")
            elif hours_per_week > 20:
                recommendations.append("You have good time commitment - consider advanced projects")
        except:
            pass
        
        # Based on interests
        if "design" in " ".join(user_profile.interests).lower():
            recommendations.append("Include UI/UX design principles in your learning")
        
        return recommendations
    
    def _generate_path_id(self) -> str:
        """Generate a unique path ID"""
        return 'path_' + ''.join(random.choices(string.ascii_lowercase + string.digits, k=9))
    
    async def get_popular_paths(self) -> PopularPathsResponse:
        """Get popular learning paths"""
        popular_paths = [
            PopularPath(
                title="Full-Stack Web Development",
                description="Complete web development from frontend to backend",
                difficulty="intermediate",
                estimated_time="6 months",
                popularity=95
            ),
            PopularPath(
                title="Data Science & Machine Learning",
                description="Learn data analysis and ML algorithms",
                difficulty="intermediate",
                estimated_time="8 months",
                popularity=88
            ),
            PopularPath(
                title="Mobile App Development",
                description="Build native and cross-platform mobile apps",
                difficulty="intermediate",
                estimated_time="5 months",
                popularity=82
            ),
            PopularPath(
                title="DevOps & Cloud Computing",
                description="Master deployment, scaling, and cloud infrastructure",
                difficulty="advanced",
                estimated_time="10 months",
                popularity=75
            ),
            PopularPath(
                title="AI & Machine Learning Engineering",
                description="Build and deploy AI/ML systems in production",
                difficulty="advanced",
                estimated_time="12 months",
                popularity=92
            ),
            PopularPath(
                title="Cybersecurity Fundamentals",
                description="Learn security principles and practices",
                difficulty="intermediate",
                estimated_time="7 months",
                popularity=78
            )
        ]
        
        return PopularPathsResponse(popular_paths=popular_paths)
    
    async def update_user_progress(self, path_id: str, milestone_id: str, completed: bool = True) -> ProgressUpdateResponse:
        """Update user progress on a learning milestone"""
        try:
            # In a real implementation, this would update a database
            return ProgressUpdateResponse(
                path_id=path_id,
                milestone_id=milestone_id,
                completed=completed,
                updated_at=datetime.now().isoformat(),
                message="Progress updated successfully"
            )
        except Exception as e:
            raise Exception(f"Progress update failed: {str(e)}")
    
    def get_service_info(self) -> Dict[str, str]:
        """Get information about the learning path service"""
        llm_config = get_llm_config()
        return {
            "service": "Learning Path Generation",
            "provider": llm_config["provider"],
            "model": llm_config["model"],
            "status": "active"
        }
