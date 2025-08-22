import { KeyUser } from '../src/personas/KeyUser';
import { BusinessAnalyst } from '../src/personas/BusinessAnalyst';
import { ProductOwner } from '../src/personas/ProductOwner';
import { ScrumMaster } from '../src/personas/ScrumMaster';
import { SolutionsArchitect } from '../src/personas/SolutionsArchitect';
import { UXUIDesigner } from '../src/personas/UXUIDesigner';
import { SupportRepresentative } from '../src/personas/SupportRepresentative';
import { BusinessStakeholder } from '../src/personas/BusinessStakeholder';
import { PersonaContext } from '../src/personas/base';

describe('Persona Tests', () => {
  const baseContext: PersonaContext = {
    prompt: 'In my Todo app, items are lost on refresh. I need data persistence.',
    language: 'en',
    tone: 'professional',
    previousTurns: [],
  };

  describe('KeyUser', () => {
    it('should generate appropriate user feedback', async () => {
      const keyUser = new KeyUser();
      const response = await keyUser.generateResponse(baseContext);
      
      expect(response).toBeDefined();
      expect(response.length).toBeGreaterThan(20);
      expect(response).toMatch(/problem|solution|user|daily|intuitive|reliable/i);
      expect(keyUser.name).toBe('Alex Chen');
      expect(keyUser.role).toBe('Key User');
    });

    it('should generate Portuguese response when language is pt-BR', async () => {
      const keyUser = new KeyUser();
      const ptContext = { ...baseContext, language: 'pt-BR' };
      const response = await keyUser.generateResponse(ptContext);
      
      expect(response).toBeDefined();
      expect(response).toMatch(/problema|diariamente|solução/);
    });
  });

  describe('BusinessAnalyst', () => {
    it('should analyze requirements and identify constraints', async () => {
      const ba = new BusinessAnalyst();
      const response = await ba.generateResponse(baseContext);
      
      expect(response).toBeDefined();
      expect(response).toMatch(/requirement|functional|constraint|KPI/i);
      expect(ba.name).toBe('Sarah Mitchell');
      expect(ba.role).toBe('Business Analyst');
    });
  });

  describe('ProductOwner', () => {
    it('should define product vision and priorities', async () => {
      const po = new ProductOwner();
      const response = await po.generateResponse(baseContext);
      
      expect(response).toBeDefined();
      expect(response).toMatch(/priority|MVP|success|metric|phase|product|value|functionality/i);
      expect(po.name).toBe('Michael Torres');
      expect(po.role).toBe('Product Owner');
    });
  });

  describe('ScrumMaster', () => {
    it('should coordinate delivery and identify risks', async () => {
      const sm = new ScrumMaster();
      const response = await sm.generateResponse(baseContext);
      
      expect(response).toBeDefined();
      expect(response).toMatch(/sprint|task|DoD|risk|team/i);
      expect(sm.name).toBe('Jamie Park');
      expect(sm.role).toBe('Scrum Master');
    });
  });

  describe('SolutionsArchitect', () => {
    it('should design technical architecture', async () => {
      const architect = new SolutionsArchitect();
      const response = await architect.generateResponse(baseContext);
      
      expect(response).toBeDefined();
      expect(response).toMatch(/architecture|IndexedDB|API|NFR|technology/i);
      expect(architect.name).toBe('Dr. Raj Patel');
      expect(architect.role).toBe('Solutions Architect');
    });

    it('should provide detailed technical design with previous context', async () => {
      const architect = new SolutionsArchitect();
      const contextWithTurns = {
        ...baseContext,
        previousTurns: [
          {
            round: 1,
            speaker: 'Sarah Mitchell',
            role: 'Business Analyst',
            content: 'Requirements include auto-save and data recovery.',
          },
          {
            round: 1,
            speaker: 'Jamie Park',
            role: 'Scrum Master',
            content: 'We need to deliver in 2 sprints.',
          },
        ],
      };
      
      const response = await architect.generateResponse(contextWithTurns);
      
      expect(response).toBeDefined();
      expect(response).toMatch(/API|conflict|performance|security|architecture|technology|robust/i);
    });
  });

  describe('UXUIDesigner', () => {
    it('should generate appropriate UX/UI design feedback', async () => {
      const designer = new UXUIDesigner();
      const response = await designer.generateResponse(baseContext);
      
      expect(response).toBeDefined();
      expect(response.length).toBeGreaterThan(20);
      expect(response).toMatch(/user|design|interface|intuitive|accessible|UX|UI/i);
      expect(designer.name).toBe('Emma Rodriguez');
      expect(designer.role).toBe('UX/UI Designer');
    });

    it('should generate Portuguese response when language is pt-BR', async () => {
      const designer = new UXUIDesigner();
      const ptContext = { ...baseContext, language: 'pt-BR' };
      const response = await designer.generateResponse(ptContext);
      
      expect(response).toBeDefined();
      expect(response).toMatch(/usuário|design|interface|intuitiva|acessível/i);
    });
  });

  describe('SupportRepresentative', () => {
    it('should generate appropriate support perspective feedback', async () => {
      const support = new SupportRepresentative();
      const response = await support.generateResponse(baseContext);
      
      expect(response).toBeDefined();
      expect(response.length).toBeGreaterThan(20);
      expect(response).toMatch(/support|documentation|maintenance|burden|customer/i);
      expect(support.name).toBe('Jordan Kim');
      expect(support.role).toBe('Support Representative');
    });

    it('should generate Portuguese response when language is pt-BR', async () => {
      const support = new SupportRepresentative();
      const ptContext = { ...baseContext, language: 'pt-BR' };
      const response = await support.generateResponse(ptContext);
      
      expect(response).toBeDefined();
      expect(response).toMatch(/suporte|documentação|documentada|manutenção/i);
    });
  });

  describe('BusinessStakeholder', () => {
    it('should generate appropriate business stakeholder feedback', async () => {
      const stakeholder = new BusinessStakeholder();
      const response = await stakeholder.generateResponse(baseContext);
      
      expect(response).toBeDefined();
      expect(response.length).toBeGreaterThan(20);
      expect(response).toMatch(/business|ROI|strategic|objectives|alignment/i);
      expect(stakeholder.name).toBe('Alexandra Chen');
      expect(stakeholder.role).toBe('Business Stakeholder');
    });

    it('should generate Portuguese response when language is pt-BR', async () => {
      const stakeholder = new BusinessStakeholder();
      const ptContext = { ...baseContext, language: 'pt-BR' };
      const response = await stakeholder.generateResponse(ptContext);
      
      expect(response).toBeDefined();
      expect(response).toMatch(/negócios|ROI|estratégico|objetivos|alinhamento/i);
    });
  });
});